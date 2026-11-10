
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";

import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";
import User from "@/models/User";

import { assembleLoadRequestLots } from
  "@/lib/inventory/assembleLoadRequestLots";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  // ==========================================
  // 1. AUTHENTICATION
  // ==========================================

  const auth = await getServerSession(authOptions);

  if (!auth?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid Load Request ID" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const user = await User.findById(auth.user.id)
    .select("userRole");

  if (
    !user ||
    !["admin", "warehouse"].includes(user.userRole)
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // ==========================================
  // 2. VALIDATE REQUEST BODY
  // ==========================================

  const body = await req.json().catch(() => null);

  if (!body || !Array.isArray(body.products)) {
    return NextResponse.json(
      { error: "Products array is required" },
      { status: 400 }
    );
  }

  type SubmittedProduct = {
    assembledQuantity: number;
    differenceReason: string | null;
  };

  const submitted = new Map<string, SubmittedProduct>();

  for (const item of body.products) {
    const productId = String(item.product ?? "");
    const rawQuantity = item.assembledQuantity;
    const quantity = Number(rawQuantity);

    if (
      !mongoose.isValidObjectId(productId) ||
      submitted.has(productId) ||
      rawQuantity === "" ||
      rawQuantity == null ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or duplicate product in preparation",
        },
        { status: 400 }
      );
    }

    const differenceReason =
      typeof item.differenceReason === "string"
        ? item.differenceReason.trim()
        : null;

    submitted.set(productId, {
      assembledQuantity: quantity,
      differenceReason: differenceReason || null,
    });
  }

  // ==========================================
  // 3. START MONGODB TRANSACTION
  // ==========================================

  const session = await mongoose.startSession();

  try {
    let preparedRequest: any = null;

    await session.withTransaction(async () => {
      // ========================================
      // 4. LOAD REQUEST
      // ========================================

      const loadRequest = await LoadRequest.findById(id)
        .session(session);

      if (!loadRequest) {
        throw new Error("LOAD_REQUEST_NOT_FOUND");
      }

      if (loadRequest.status !== "assigned") {
        throw new Error(
          "LOAD_REQUEST_NOT_ASSIGNED"
        );
      }

      // Version 1 requires explicit lot tracking.
      // Older requests must follow a controlled
      // legacy path instead of inventing lot IDs.
      const trackingVersion = Number(loadRequest.lotTrackingVersion ?? 0);
      if (![0, 1].includes(trackingVersion)) {
        throw new Error("Unsuported lot tracking version");
      }
      const isLotTracked = trackingVersion === 1;

      // ========================================
      // 5. VALIDATE SUBMITTED PRODUCTS
      // ========================================

      if (loadRequest.products.length !== submitted.size) {
        throw new Error(
          "Every load request product must be included"
        );
      }

      const requestProductIds = new Set<string>();

      for (const line of loadRequest.products) {
        const productId = String(line.product);

        if (requestProductIds.has(productId)) {
          throw new Error(
            `Duplicate product in Load Request: ${productId}`
          );
        }

        requestProductIds.add(productId);

        if (!submitted.has(productId)) {
          throw new Error(
            `Missing assembled quantity for ${productId}`
          );
        }
      }

      for (const productId of submitted.keys()) {
        if (!requestProductIds.has(productId)) {
          throw new Error(
            `Product ${productId} does not belong to this Load Request`
          );
        }
      }

      // ========================================
      // 6. PREPARE EACH PRODUCT
      // ========================================

      const assembledAt = new Date();

      for (const line of loadRequest.products) {
        const productId = String(line.product);

        const incoming = submitted.get(productId)!;

        const approvedQty = Number(
          line.approvedQuantity ?? 0
        );

        const assembledQty =
          incoming.assembledQuantity;

        // --------------------------------------
        // QUANTITY VALIDATION
        // --------------------------------------

        if (
          !Number.isSafeInteger(approvedQty) ||
          approvedQty < 0 ||
          assembledQty > approvedQty
        ) {
          throw new Error(
            `Invalid assembled quantity for ${productId}. ` +
            `Approved: ${approvedQty}, ` +
            `Assembled: ${assembledQty}`
          );
        }

        const difference = approvedQty - assembledQty;

        if (
          difference > 0 &&
          !incoming.differenceReason
        ) {
          throw new Error(
            `A difference reason is required for ` +
            `product ${productId}.`
          );
        }

        // --------------------------------------
        // VERIFY RESERVED LOT TOTAL
        // --------------------------------------


        const reservedAllocations =
          line.reservedLotAllocations ?? [];

        if (isLotTracked) {
          const reservedLotIds = new Set<string>();
          let totalReserved = 0;

          for (const allocation of reservedAllocations) {
            const lotId = String(allocation.lotId);
            const qty = Number(allocation.quantity);
            const cost = Number(allocation.unitCost);

            if (
              !mongoose.isValidObjectId(lotId) ||
              reservedLotIds.has(lotId) ||
              !Number.isSafeInteger(qty) ||
              qty <= 0 ||
              !Number.isFinite(cost) ||
              cost < 0
            ) {
              throw new Error(
                `Invalid reserved lots for ${productId}`
              );
            }

            reservedLotIds.add(lotId);
            totalReserved += qty;
          }

          if (totalReserved !== approvedQty) {
            throw new Error(
              `Lot reservations do not match approved quantity ` +
              `for ${productId}. Approved: ${approvedQty}, ` +
              `reserved: ${totalReserved}`
            );
          }
        } else {
          // Legacy requests were approved without individual
          // lot reservations. Do not invent historical lots.
          if (reservedAllocations.length > 0) {
            throw new Error(
              `Legacy load request has unexpected lot ` +
              `reservations for ${productId}`
            );
          }
        }


        // --------------------------------------
        // ZERO APPROVED QUANTITY
        // --------------------------------------

        if (approvedQty === 0) {
          line.assembledQuantity = 0;
          line.assembledLotAllocations = [];
          line.differenceReason = null;
          continue;
        }

        // --------------------------------------
        // LOAD PHOENIX INVENTORY
        // --------------------------------------

        const inventory = await ProductInventory.findOne({
          product: line.product,
        }).session(session);

        if (!inventory) {
          throw new Error(
            `Phoenix inventory not found for ${productId}`
          );
        }

        const preSaved = Number(
          inventory.preSavedInventory ?? 0
        );

        const onRoute = Number(
          inventory.onRouteInventory ?? 0
        );

        if (
          !Number.isSafeInteger(preSaved) ||
          preSaved < approvedQty ||
          !Number.isSafeInteger(onRoute) ||
          onRoute < 0
        ) {
          throw new Error(
            `Insufficient reserved inventory for ${productId}. ` +
            `Required: ${approvedQty}, ` +
            `Pre-saved: ${preSaved}`
          );
        }

        // --------------------------------------
        // ALLOCATE PHYSICALLY ASSEMBLED LOTS
        // --------------------------------------

        const assembledAllocations = isLotTracked ?
          assembleLoadRequestLots(
            inventory,
            reservedAllocations,
            assembledQty
          ) : [];

        // Validate the helper result too.
        const assembledLotTotal =
          assembledAllocations.reduce(
            (sum: number, allocation: any) =>
              sum + Number(allocation.quantity ?? 0),
            0
          );

        if (isLotTracked && assembledLotTotal !== assembledQty) {
          throw new Error(
            `Assembled lot mismatch for ${productId}. Expected: ${assembledQty}, actual: ${assembledLotTotal}`
          );
        }

        // --------------------------------------
        // AGGREGATE INVENTORY MOVEMENT
        // --------------------------------------
        //
        // IMPORTANT:
        //
        // Do NOT deduct currentQty here.
        // Do NOT release onRouteReservedQty here.
        //
        // Both are updated later during
        // delivery or warehouse reconciliation.
        // --------------------------------------

        inventory.preSavedInventory =
          preSaved - assembledQty;

        inventory.onRouteInventory =
          onRoute + assembledQty;

        await inventory.save({ session });

        // --------------------------------------
        // SAVE LOAD REQUEST LINE
        // --------------------------------------

        line.assembledQuantity = assembledQty;
        line.assembledLotAllocations =
          assembledAllocations;

        line.deliveredQuantity = 0;
        line.lotAllocations = [];

        line.differenceReason =
          difference > 0
            ? incoming.differenceReason
            : null;
      }

      // ========================================
      // 7. MARK LOAD REQUEST AS PREPARED
      // ========================================

      loadRequest.status = "prepared";
      loadRequest.assembledBy = user._id;
      loadRequest.assembledAt = assembledAt;

      await loadRequest.save({ session });

      preparedRequest = loadRequest;
    });

    // ==========================================
    // 8. TRANSACTION COMMITTED SUCCESSFULLY
    // ==========================================

    return NextResponse.json({
      success: true,
      message:
        "Load request prepared successfully. " +
        "Inventory and assembled lots updated.",
      loadRequest: preparedRequest,
    });
  } catch (error: any) {
    console.error(
      "PREPARE LOAD REQUEST ERROR:",
      error
    );

    if (error.message === "LOAD_REQUEST_NOT_FOUND") {
      return NextResponse.json(
        { error: "Load request not found" },
        { status: 404 }
      );
    }

    if (error.message === "LOAD_REQUEST_NOT_ASSIGNED") {
      return NextResponse.json(
        {
          error:
            "Only assigned Load Requests can be prepared.",
        },
        { status: 409 }
      );
    }

    const writeConflict =
      error?.code === 112 ||
      error?.hasErrorLabel?.(
        "TransientTransactionError"
      );

    if (writeConflict) {
      return NextResponse.json(
        {
          error:
            "Inventory changed during preparation. " +
            "Please refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to prepare Load Request",
      },
      { status: 400 }
    );
  } finally {
    await session.endSession();
  }
}
