import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";

async function getUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}


function releaseLoadRequestLots(
  inventory: any,
  allocations: any[],
  expectedQuantity: number
) {
  if (
    !Number.isSafeInteger(expectedQuantity) ||
    expectedQuantity < 0
  ) {
    throw new Error("Invalid quantity to release");
  }

  const allocated = allocations.reduce(
    (sum: number, allocation: any) =>
      sum + Number(allocation.quantity ?? 0),
    0
  );

  if (allocated !== expectedQuantity) {
    throw new Error(
      "Load request lot allocations do not match " +
      "the approved quantity"
    );
  }

  const seen = new Set<string>();

  for (const allocation of allocations) {
    const lotId = String(allocation.lotId);
    const qty = Number(allocation.quantity);

    if (
      !mongoose.isValidObjectId(lotId) ||
      seen.has(lotId) ||
      !Number.isSafeInteger(qty) ||
      qty <= 0
    ) {
      throw new Error(
        "Invalid or duplicate reserved lot allocation"
      );
    }

    seen.add(lotId);

    const lot = inventory.lots.id(lotId);

    if (!lot) {
      throw new Error(
        `Reserved lot ${lotId} no longer exists`
      );
    }

    const reserved = Number(
      lot.onRouteReservedQty ?? 0
    );

    if (reserved < qty) {
      throw new Error(
        `Insufficient lot reservations for ${lotId}`
      );
    }

    lot.onRouteReservedQty = reserved - qty;
  }
}


export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();
  
  const mongoSession = await mongoose.startSession();
  try {
    
    const user = await getUser();

    if (!["admin", "warehouse"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;

    const body = await req.json();
    const cancelReason = typeof body.cancelReason === "string"
      ? body.cancelReason.trim()
      : "";

    if (!cancelReason) {
      return NextResponse.json({ error: "Cancellation reason is required" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Load Request ID" }, { status: 400 });
    }

    let cancelledLoadRequest: any = null;

    await mongoSession.withTransaction(async () => {
      const loadRequest = await LoadRequest.findById(id)
        .session(mongoSession);

      if (!loadRequest) {
        throw new Error("LOAD_REQUEST_NOT_FOUND");
      }

      if (loadRequest.status === "cancelled") {
        throw new Error("ALREADY_CANCELLED");
      }
      if (loadRequest.status === "delivered") {
        throw new Error("ALREADY_DELIVERED");
      }
      if (loadRequest.status === "rejected") {
        throw new Error("ALREADY_REJECTED");
      }

      const cancellableStatuses = [
        "pending", "approved", "assigned", "prepared",
      ];

      if (!cancellableStatuses.includes(loadRequest.status)) {
        throw new Error("INVALID_STATUS");
      }

      const originalStatus = loadRequest.status;

      if (originalStatus === "pending") {
        console.log(`Cancelling pending load request ${loadRequest.LRNumber}. No inventory movement required`);
      }

      if (
        ["approved", "assigned", "prepared"].includes(
          originalStatus
        )
      ) {
        for (const item of loadRequest.products) {
          const approved = Number(
            item.approvedQuantity ?? 0
          );

          const assembled =
            originalStatus === "prepared"
              ? Number(item.assembledQuantity ?? 0)
              : 0;

          if (
            !Number.isSafeInteger(approved) ||
            !Number.isSafeInteger(assembled) ||
            approved < 0 ||
            assembled < 0 ||
            assembled > approved
          ) {
            throw new Error(
              `Invalid load-request quantities for ${item.product}`
            );
          }

          if (approved === 0) continue;

          const inventory =
            await ProductInventory.findOne({
              product: item.product,
            }).session(mongoSession);

          if (!inventory) {
            throw new Error(
              `Inventory not found for ${item.product}`
            );
          }

          const preSavedToRestore =
            approved - assembled;

          const onRouteToRestore = assembled;

          if (
            Number(inventory.preSavedInventory ?? 0) <
            preSavedToRestore ||
            Number(inventory.onRouteInventory ?? 0) <
            onRouteToRestore
          ) {
            throw new Error(
              `Inventory balances do not match load request ` +
              `${loadRequest.LRNumber} for product ${item.product}`
            );
          }

          releaseLoadRequestLots(
            inventory,
            item.reservedLotAllocations ?? [],
            approved
          );

          inventory.preSavedInventory =
            Number(inventory.preSavedInventory ?? 0) -
            preSavedToRestore;

          inventory.onRouteInventory =
            Number(inventory.onRouteInventory ?? 0) -
            onRouteToRestore;

          inventory.currentInventory =
            Number(inventory.currentInventory ?? 0) +
            approved;

          await inventory.save({
            session: mongoSession,
          });
        }
      }

      loadRequest.status = "cancelled";
      loadRequest.cancelReason = cancelReason;
      loadRequest.cancelledBy = user.id;
      loadRequest.cancelledAt = new Date();
      await loadRequest.save({
        session: mongoSession,
      });
      cancelledLoadRequest = loadRequest;
    });
    return NextResponse.json({
      success: true,
      message: "Load Request cancelled and inventory restored successfully",
      loadRequest: cancelledLoadRequest,
    });
  } catch (err: any) {
    console.error(`CANCEL LOAD REQUEST ERROR: `, err);
    if (err.message === "Unauthorized") {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (err.message === "LOAD_REQUEST_NOT_FOUND") {
      return NextResponse.json(
        {
          error: "Load request not found",
        },
        { status: 404 }
      );
    }

    if (err.message === "ALREADY_CANCELLED") {
      return NextResponse.json(
        {
          error:
            "Load request has already been cancelled",
        },
        { status: 400 }
      );
    }

    if (err.message === "ALREADY_DELIVERED") {
      return NextResponse.json(
        {
          error:
            "Delivered load requests cannot be cancelled",
        },
        { status: 400 }
      );
    }

    if (err.message === "ALREADY_REJECTED") {
      return NextResponse.json(
        {
          error:
            "Rejected load requests cannot be cancelled",
        },
        { status: 400 }
      );
    }

    if (err.message === "INVALID_STATUS") {
      return NextResponse.json(
        {
          error:
            "Load request cannot be cancelled in its current status",
        },
        { status: 400 }
      );
    }

    if (
      err.message?.startsWith(
        "INSUFFICIENT_PRESAVED:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to cancel because the reserved inventory does not match the load request. No inventory changes were made.",
        },
        { status: 409 }
      );
    }

    if (
      err.message?.startsWith(
        "INSUFFICIENT_ON_ROUTE:"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Unable to cancel because the on-route inventory does not match the prepared load request. No inventory changes were made.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          err.message || "Server error",
      },
      { status: 500 }
    );

  } finally {
    await mongoSession.endSession();
  }
}