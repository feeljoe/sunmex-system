
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { connectToDatabase } from "@/lib/db";
import { authOptions } from "@/lib/auth";

import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";
import User from "@/models/User";

import { reserveLoadRequestLots } from
  "@/lib/inventory/reserveLoadRequestLots";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
      { error: "Invalid load request ID" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body || !Array.isArray(body.products)) {
    return NextResponse.json(
      { error: "Products array is required" },
      { status: 400 }
    );
  }

  const submitted = new Map<string, number>();

  for (const item of body.products) {
    const productId = String(item.product ?? "");
    const quantity = Number(item.quantity);

    if (
      !mongoose.isValidObjectId(productId) ||
      submitted.has(productId) ||
      item.quantity === "" ||
      item.quantity == null ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0
    ) {
      return NextResponse.json(
        {
          error: "Invalid or duplicate product quantity",
        },
        { status: 400 }
      );
    }

    submitted.set(productId, quantity);
  }

  await connectToDatabase();


  if (auth?.user?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const session = await mongoose.startSession();

  try {
    let result: any = null;

    await session.withTransaction(async () => {
      const loadRequest = await LoadRequest.findById(id)
        .session(session);

      if (!loadRequest) {
        throw new Error("Load request not found");
      }

      if (
        loadRequest.requestType !== "route" ||
        loadRequest.status !== "pending"
      ) {
        throw new Error(
          "Only pending route load requests can be reviewed"
        );
      }

      const expectedProducts = new Set<string>();

      for (const line of loadRequest.products) {
        const productId = String(line.product);

        if (expectedProducts.has(productId)) {
          throw new Error(
            `Duplicate product in load request: ${productId}`
          );
        }

        expectedProducts.add(productId);
      }

      if (submitted.size !== expectedProducts.size) {
        throw new Error(
          "Approval must include every requested product"
        );
      }

      for (const productId of submitted.keys()) {
        if (!expectedProducts.has(productId)) {
          throw new Error(
            `Product ${productId} does not belong to this load request`
          );
        }
      }

      let hasApprovedProducts = false;

      for (const line of loadRequest.products) {
        const productId = String(line.product);
        const approvedQuantity = submitted.get(productId);

        if (approvedQuantity === undefined) {
          throw new Error(
            `Missing approved quantity for ${productId}`
          );
        }

        const requestedQty = Number(
          line.requestedQuantity ?? 0
        );

        if (
          !Number.isSafeInteger(requestedQty) ||
          requestedQty < 0
        ) {
          throw new Error(
            `Approved quantity is invalid for ${productId}`
          );
        }

        line.approvedQuantity = approvedQuantity;
        line.assembledQuantity = 0;
        line.deliveredQuantity = 0;
        line.lotAllocations = [];
        line.reservedLotAllocations = [];

        if (approvedQuantity === 0) continue;

        hasApprovedProducts = true;

        const inventory =
          await ProductInventory.findOne({
            product: line.product,
          }).session(session);

        if (!inventory) {
          throw new Error(
            `Phoenix inventory not found for ${productId}`
          );
        }

        if (
          Number(inventory.currentInventory ?? 0) <
          approvedQuantity
        ) {
          throw new Error(
            `Insufficient Phoenix inventory for ${productId}`
          );
        }

        // Reserve specific lots.
        const allocations = reserveLoadRequestLots(
          inventory,
          approvedQuantity
        );

        // Reserve aggregate inventory as well.
        inventory.currentInventory =
          Number(inventory.currentInventory ?? 0) -
          approvedQuantity;

        inventory.preSavedInventory =
          Number(inventory.preSavedInventory ?? 0) +
          approvedQuantity;

        line.reservedLotAllocations = allocations;

        await inventory.save({ session });
      }

      loadRequest.status = hasApprovedProducts
        ? "approved"
        : "rejected";

      loadRequest.reviewedBy = auth?.user?.id;
      loadRequest.reviewedAt = new Date();
      loadRequest.lotTrackingVersion = hasApprovedProducts ? 1: 0;

      await loadRequest.save({ session });

      result = {
        success: true,
        message: hasApprovedProducts
          ? "Load request approved and lots reserved"
          : "Load request rejected",
        loadRequest,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("LOAD REQUEST APPROVAL ERROR:", error);

    const conflict =
      error?.code === 112 ||
      error?.hasErrorLabel?.("TransientTransactionError");

    return NextResponse.json(
      {
        error: conflict
          ? "Inventory changed during approval. Please retry."
          : error.message || "Failed to review load request",
      },
      { status: conflict ? 409 : 400 }
    );
  } finally {
    await session.endSession();
  }
}
