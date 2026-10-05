import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import InventoryReview from "@/models/InventoryReview";
import User from "@/models/User";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getNextBusinessDay } from "@/utils/getNextBusinessDay";
import { DateTime } from "luxon";
import {
  getInventoryModel,
  normalizeInventoryLocation,
} from "@/utils/inventoryResolver";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const sessionUser = await getServerSession(authOptions);

  if (!sessionUser?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();
    const { products, isPartial } = body;

    if (!Array.isArray(products)) {
      throw new Error("Products are required");
    }

    // =========================================================
    // USER
    // =========================================================

    const user = await User.findById(sessionUser.user.id)
      .select("location userRole")
      .session(session);

    if (!user) {
      throw new Error("User not found");
    }

    if (!["admin", "warehouse"].includes(user.userRole)) {
      await session.abortTransaction();
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // =========================================================
    // PREORDER
    // =========================================================

    const preorder = await PreOrder.findById(id).session(session);

    if (!preorder) {
      throw new Error("Preorder not found");
    }

    if (preorder.status !== "pending" && preorder.status !== "assigned") {
      throw new Error("Preorder cannot be modified");
    }

    // =========================================================
    // LOCATION SECURITY
    // =========================================================

    const inventoryLocation = normalizeInventoryLocation(
      preorder.inventoryLocation
    );

    const userInventoryLocation = normalizeInventoryLocation(user.location);

    if (userInventoryLocation !== inventoryLocation) {
      await session.abortTransaction();

      return NextResponse.json(
        {
          error: `This preorder belongs to ${inventoryLocation} inventory. Your warehouse location is ${userInventoryLocation}.`,
        },
        { status: 403 }
      );
    }

    // =========================================================
    // PARTIAL SAVE
    //
    // IMPORTANT:
    // This section returns BEFORE touching inventory.
    // =========================================================

    if (isPartial === true) {
      for (const update of products) {
        const inventoryId =
          typeof update.productInventory === "string"
            ? update.productInventory
            : update.productInventory?._id;

        if (!inventoryId) {
          throw new Error("Inventory ID is missing");
        }

        const line = preorder.products.find(
          (p: any) =>
            p.productInventory?.toString() === inventoryId.toString()
        );

        if (!line) {
          throw new Error("Product does not belong to this preorder");
        }

        const orderedQty = Math.round(Number(line.quantity || 0));
        const pickedQty = Math.round(Number(update.pickedQuantity || 0));

        if (pickedQty < 0) {
          throw new Error("Picked quantity cannot be negative");
        }

        if (pickedQty > orderedQty) {
          throw new Error("Picked quantity cannot exceed ordered quantity");
        }

        // Only save warehouse progress.
        // NO inventory validation or movement.
        line.pickedQuantity = pickedQty;

        // Reason can be saved if the warehouse user already selected one,
        // but it is NOT required for partial saves.
        line.differenceReason =
          update.differenceReason || undefined;

        // Do not save authorization during partial progress.
        line.authorizedBy = undefined;
      }

      preorder.updatedBy = new mongoose.Types.ObjectId(
        sessionUser.user.id
      );

      preorder.updatedAt = new Date();

      await preorder.save({ session });
      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        partial: true,
        message: "Progress saved",
        preorder,
      });
    }

    // =========================================================
    // FROM THIS POINT FORWARD:
    // FULL COMPLETION ONLY
    // =========================================================

    const isForeignInventory = inventoryLocation !== "phoenix";
    const InventoryModel = getInventoryModel(inventoryLocation);

    // =========================================================
    // COMPLETE EACH PRODUCT
    // =========================================================

    for (const update of products) {
      const inventoryId =
        typeof update.productInventory === "string"
          ? update.productInventory
          : update.productInventory?._id;

      if (!inventoryId) {
        throw new Error("Inventory ID is missing");
      }

      const line = preorder.products.find(
        (p: any) =>
          p.productInventory?.toString() === inventoryId.toString()
      );

      if (!line) {
        throw new Error("Product does not belong to this preorder");
      }

      // =======================================================
      // CORRECT INVENTORY COLLECTION
      // =======================================================

      const inventory = await InventoryModel.findById(inventoryId)
        .populate({
          path: "product",
          populate: { path: "brand" },
        })
        .session(session);

      if (!inventory) {
        throw new Error("Inventory record not found");
      }

      if (
        isForeignInventory &&
        inventory.location !== inventoryLocation
      ) {
        throw new Error(
          "Inventory record belongs to a different foreign location"
        );
      }

      const product = inventory.product;

      const displayName = [
        product?.brand?.name,
        product?.name,
        product?.weight
          ? `${product.weight}${product?.unit || ""}`
          : "",
      ]
        .filter(Boolean)
        .join(" ");

      // =======================================================
      // QUANTITIES
      // =======================================================

      const orderedQty = Math.round(Number(line.quantity || 0));
      const pickedQty = Math.round(Number(update.pickedQuantity || 0));
      const diffQty = orderedQty - pickedQty;

      if (pickedQty < 0) {
        throw new Error(
          `Picked quantity cannot be negative for ${displayName}`
        );
      }

      if (pickedQty > orderedQty) {
        throw new Error(
          `Picked quantity cannot exceed ordered quantity for ${displayName}`
        );
      }

      // =======================================================
      // DIFFERENCE VALIDATION
      //
      // Only happens when completing.
      // =======================================================

      if (diffQty > 0 && !update.differenceReason) {
        throw new Error(
          `A shortage reason is required for ${displayName}`
        );
      }

      // Phoenix shortages require authorization.
      if (
        diffQty > 0 &&
        !isForeignInventory &&
        !update.authorizedBy
      ) {
        throw new Error(
          `Shortage for ${displayName} requires admin authorization`
        );
      }

      // =======================================================
      // INVENTORY VALIDATION
      //
      // Only happens when completing.
      // =======================================================

      const availablePreSaved = Number(
        inventory.preSavedInventory || 0
      );

      if (availablePreSaved < orderedQty) {
        throw new Error(
          `Insufficient pre-saved inventory for ${displayName}. Required: ${orderedQty}. Available: ${availablePreSaved}.`
        );
      }

      // =======================================================
      // PICKED: preSaved -> onRoute
      // =======================================================

      if (pickedQty > 0) {
        inventory.preSavedInventory -= pickedQty;
        inventory.onRouteInventory =
          Number(inventory.onRouteInventory || 0) + pickedQty;
      }

      // =======================================================
      // SHORTAGE: preSaved -> inactive
      // =======================================================

      if (diffQty > 0) {
        inventory.preSavedInventory -= diffQty;

        inventory.inactiveInventory =
          Number(inventory.inactiveInventory || 0) + diffQty;

        // Phoenix inventory uses InventoryReview.
        if (!isForeignInventory) {
          await InventoryReview.create(
            [
              {
                product: inventory.product?._id || inventory.product,
                quantity: diffQty,
                differenceReason: update.differenceReason,
                authorizedBy: new mongoose.Types.ObjectId(
                  update.authorizedBy
                ),
                generatedBy: new mongoose.Types.ObjectId(
                  sessionUser.user.id
                ),
                source: preorder._id,
                status: "pending",
              },
            ],
            { session }
          );
        }
      }

      await inventory.save({ session });

      // =======================================================
      // UPDATE PREORDER LINE
      // =======================================================

      line.pickedQuantity = pickedQty;

      line.differenceReason =
        diffQty > 0
          ? update.differenceReason
          : undefined;

      line.authorizedBy =
        !isForeignInventory &&
        diffQty > 0 &&
        update.authorizedBy
          ? new mongoose.Types.ObjectId(update.authorizedBy)
          : undefined;
    }

    // =========================================================
    // COMPLETE PREORDER
    // =========================================================

    const phoenixNow = DateTime.now().setZone("America/Phoenix");
    const assembledAt = phoenixNow.toUTC().toJSDate();

    preorder.assembledBy = new mongoose.Types.ObjectId(
      sessionUser.user.id
    );

    preorder.assembledAt = assembledAt;
    preorder.deliveryDate = getNextBusinessDay(assembledAt);
    preorder.status = "ready";
    preorder.updatedBy = new mongoose.Types.ObjectId(
      sessionUser.user.id
    );
    preorder.updatedAt = new Date();

    await preorder.save({ session });
    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      partial: false,
      inventoryLocation,
      inventoryModel: isForeignInventory
        ? "ForeignInventory"
        : "ProductInventory",
      preorder,
    });
  } catch (err: any) {
    await session.abortTransaction();

    console.error("COMPLETE PREORDER ERROR:", err);

    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to prepare preorder",
      },
      { status: 400 }
    );
  } finally {
    await session.endSession();
  }
}