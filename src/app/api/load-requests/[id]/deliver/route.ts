
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";

import { connectToDatabase } from "@/lib/db";
import { authOptions } from "@/lib/auth";

import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";
import ForeignInventory from "@/models/ForeignInventory";
import Route from "@/models/Route";

async function getUser(req: Request) {
  const authorization = req.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7);

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured");
    }

    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded !== "object" ||
      !decoded ||
      !decoded.id && !decoded._id
    ) {
      throw new Error("Invalid authentication token");
    }

    return {
      id: String(decoded.id ?? decoded._id),
      role: String(decoded.role ?? ""),
    };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return {
    id: session.user.id,
    role: session.user.role,
  };
}

type LotAllocation = {
  lotId: mongoose.Types.ObjectId;
  lotNumber: string | null;
  quantity: number;
  unitCost: number;
  expirationDate: Date | null;
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { error: "Invalid load request ID" },
      { status: 400 }
    );
  }

  let user: Awaited<ReturnType<typeof getUser>>;

  try {
    user = await getUser(req);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Unauthorized" },
      { status: 401 }
    );
  }

  if (!["admin", "driver"].includes(user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);

  if (!body || !Array.isArray(body.products)) {
    return NextResponse.json(
      { error: "Products array is required" },
      { status: 400 }
    );
  }

  const supplied = new Map<string, {
    quantity: number;
    differenceReason: string | null;
  }>();

  for (const item of body.products) {
    const productId = String(item.productId ?? "");
    const quantity = Number(item.deliveredQuantity);

    if (
      !mongoose.isValidObjectId(productId) ||
      supplied.has(productId) ||
      item.deliveredQuantity === "" ||
      item.deliveredQuantity == null ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0
    ) {
      return NextResponse.json(
        { error: "Invalid or duplicate delivered product" },
        { status: 400 }
      );
    }

    supplied.set(productId, {
      quantity,
      differenceReason:
        typeof item.differenceReason === "string"
          ? item.differenceReason
          : null,
    });
  }

  await connectToDatabase();

  const session = await mongoose.startSession();

  try {
    let responseData: any = null;

    await session.withTransaction(async () => {
      const loadRequest = await LoadRequest.findById(id)
        .session(session);

      if (!loadRequest) {
        throw new Error("Load request not found");
      }

      if (loadRequest.status !== "prepared") {
        throw new Error(
          "Load request must be prepared before delivery"
        );
      }

      const isForeign =
        loadRequest.requestType === "foreign";

      const trackingVersion = Number(loadRequest.lotTrackingVersion ?? 0);
      if (![0, 1].includes(trackingVersion)) {
        throw new Error(`Unsupported lot tracking version: ${trackingVersion}`);
      }
      const isLotTracked = trackingVersion === 1;

      const destinationLocation =
        loadRequest.destinationLocation;

      if (isForeign && !destinationLocation) {
        throw new Error(
          "Foreign destination location is missing"
        );
      }

      let destinationRoute: any = null;

      if (!isForeign) {
        const routeId = loadRequest.route;

        if (!routeId) {
          throw new Error(
            "Destination route is missing"
          );
        }

        destinationRoute = await Route.findById(
          routeId
        ).session(session);

        if (!destinationRoute) {
          throw new Error(
            "Destination route not found"
          );
        }
      }

      const deliveredAt = new Date();
      const expectedIds = new Set<string>();

      for (const line of loadRequest.products) {
        const productId = String(
          line.product?._id ?? line.product
        );

        expectedIds.add(productId);

        const submitted = supplied.get(productId);

        if (!submitted) {
          throw new Error(
            `Missing delivered count for ${productId}`
          );
        }

        const deliveredQty = submitted.quantity;
        const assembledQty = Number(
          line.assembledQuantity ?? 0
        );

        if (
          !Number.isSafeInteger(assembledQty) ||
          assembledQty < 0 ||
          deliveredQty > assembledQty
        ) {
          throw new Error(
            `Delivered quantity exceeds assembled ` +
            `quantity for ${productId}`
          );
        }

        line.deliveredQuantity = deliveredQty;
        line.differenceReason =
          submitted.differenceReason;

        if (isLotTracked) {
          const reservedQty = (
            line.reservedLotAllocations ?? []
          ).reduce(
            (sum: number, lot: any) =>
              sum + Number(lot.quantity ?? 0),
            0
          );

          const assembledLotQty = (
            line.assembledLotAllocations ?? []
          ).reduce(
            (sum: number, lot: any) =>
              sum + Number(lot.quantity ?? 0),
            0
          );

          if (
            reservedQty !== Number(line.approvedQuantity ?? 0) ||
            assembledLotQty !== assembledQty
          ) {
            throw new Error(
              `Incomplete lot tracking for ${productId}`
            );
          }
        }

        if (deliveredQty === 0) {
          line.lotAllocations = [];
          continue;
        }

        const phoenixInventory =
          await ProductInventory.findOne({
            product: line.product,
          }).session(session);

        if (!phoenixInventory) {
          throw new Error(
            `Phoenix inventory missing for ${productId}`
          );
        }

        if (
          Number(
            phoenixInventory.onRouteInventory ?? 0
          ) < deliveredQty
        ) {
          throw new Error(
            `Insufficient on-route inventory for ${productId}`
          );
        }

        let allocations: any[] = [];

        if (isLotTracked) {
          const approvedAllocations =
            line.reservedLotAllocations ?? [];

          const assembledAllocations =
            line.assembledLotAllocations ?? [];

          const approvedLotQty = approvedAllocations.reduce(
            (sum: number, lot: any) =>
              sum + Number(lot.quantity ?? 0),
            0
          );

          const assembledLotQty = assembledAllocations.reduce(
            (sum: number, lot: any) =>
              sum + Number(lot.quantity ?? 0),
            0
          );

          if (
            approvedLotQty !== Number(line.approvedQuantity ?? 0) ||
            assembledLotQty !== assembledQty
          ) {
            throw new Error(
              `Invalid approved or assembled lot allocations ` +
              `for product ${productId}`
            );
          }

          allocations = consumeReservedLots(
            phoenixInventory,
            assembledAllocations,
            deliveredQty,
            deliveredAt
          );
        } else {
          // LEGACY: no historical lot allocations were recorded.
          // Preserve the original aggregate-only behavior.
          // Never invent lot IDs for these deliveries.
          allocations = [];
        }

        phoenixInventory.onRouteInventory =
          Number(phoenixInventory.onRouteInventory ?? 0) -
          deliveredQty;

        line.lotAllocations = allocations;

        await phoenixInventory.save({ session });


        if (isForeign) {
          let foreignInventory =
            await ForeignInventory.findOne({
              location: destinationLocation,
              product: line.product,
            }).session(session);

          if (!foreignInventory) {
            foreignInventory = new ForeignInventory({
              location: destinationLocation,
              product: line.product,
              currentInventory: 0,
              lots: [],
            });
          }

          foreignInventory.currentInventory =
            Number(
              foreignInventory.currentInventory ?? 0
            ) + deliveredQty;

          if (isLotTracked) {
            for (const allocation of allocations) {
              const existingLot =
                foreignInventory.lots.id(
                  allocation.lotId
                );

              if (existingLot) {
                existingLot.currentQty =
                  Number(existingLot.currentQty ?? 0) +
                  allocation.quantity;

                existingLot.originalQty =
                  Number(existingLot.originalQty ?? 0) +
                  allocation.quantity;
              } else {
                foreignInventory.lots.push({
                  _id: allocation.lotId,
                  lotNumber: allocation.lotNumber,
                  cost: allocation.unitCost,
                  originalQty: allocation.quantity,
                  currentQty: allocation.quantity,
                  onRouteReservedQty: 0,
                  receivedAt: deliveredAt,
                  expirationDate:
                    allocation.expirationDate,
                  hasMovement: true,
                  lastMovementAt: deliveredAt,
                });
              }
            }
          }

          await foreignInventory.save({ session });
        } else {
          const existingRouteItem =
            destinationRoute.inventory.find(
              (entry: any) =>
                String(entry.product) === productId
            );

          if (existingRouteItem) {
            existingRouteItem.quantity =
              Number(existingRouteItem.quantity ?? 0) +
              deliveredQty;
          } else {
            destinationRoute.inventory.push({
              product: line.product,
              quantity: deliveredQty,
            });
          }
        }
      }

      for (const productId of supplied.keys()) {
        if (!expectedIds.has(productId)) {
          throw new Error(
            `Unexpected product in delivery: ${productId}`
          );
        }
      }

      if (destinationRoute) {
        await destinationRoute.save({ session });
      }

      if (typeof body.signature === "string") {
        loadRequest.signature = body.signature;
      }

      loadRequest.status = "delivered";
      loadRequest.deliveredAt = deliveredAt;

      await loadRequest.save({ session });

      responseData = {
        success: true,
        loadRequestId: loadRequest._id,
        destinationLocation:
          isForeign ? destinationLocation : "route",
        products: loadRequest.products.length,
      };
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error(
      "LOAD REQUEST DELIVERY ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to deliver load request",
      },
      { status: 409 }
    );
  } finally {
    await session.endSession();
  }
}


function consumeReservedLots(
  inventory: any,
  reservedAllocations: any[],
  deliveredQuantity: number,
  movementDate: Date
) {
  if (
    !Number.isSafeInteger(deliveredQuantity) ||
    deliveredQuantity < 0
  ) {
    throw new Error("Invalid delivered quantity");
  }

  if (!Array.isArray(reservedAllocations)) {
    throw new Error("Missing reserved lot allocations");
  }

  const totalReserved = reservedAllocations.reduce(
    (sum: number, allocation: any) => {
      const qty = Number(allocation.quantity);

      if (
        !Number.isSafeInteger(qty) ||
        qty <= 0
      ) {
        throw new Error(
          "Invalid reserved lot quantity"
        );
      }

      return sum + qty;
    },
    0
  );

  if (deliveredQuantity > totalReserved) {
    throw new Error(
      "Delivered quantity exceeds reserved lots"
    );
  }

  let remaining = deliveredQuantity;

  const deliveredAllocations: any[] = [];
  const seenLots = new Set<string>();

  for (const reserved of reservedAllocations) {
    const lotId = String(reserved.lotId);

    const cost = Number(reserved.unitCost);

    if (
      !mongoose.isValidObjectId(lotId) ||
      !Number.isFinite(cost) ||
      cost < 0
    ) {
      throw new Error(
        `Invalid assembled lot allocation: ${lotId}`
      );
    }

    if (seenLots.has(lotId)) {
      throw new Error(
        `Duplicate reserved lot: ${lotId}`
      );
    }

    seenLots.add(lotId);

    const lot = inventory.lots.id(reserved.lotId);

    if (!lot) {
      throw new Error(
        `Reserved inventory lot not found: ${lotId}`
      );
    }

    const reservedQty = Number(
      lot.onRouteReservedQty ?? 0
    );

    const currentQty = Number(
      lot.currentQty ?? 0
    );

    if (
      !Number.isSafeInteger(reservedQty) ||
      !Number.isSafeInteger(currentQty) ||
      reservedQty < 0 ||
      currentQty < 0 ||
      reservedQty > currentQty
    ) {
      throw new Error(
        `Invalid stock state for lot ${lotId}`
      );
    }

    const quantity = Math.min(
      Number(reserved.quantity),
      remaining
    );

    if (quantity <= 0) continue;

    if (
      currentQty < quantity ||
      reservedQty < quantity
    ) {
      throw new Error(
        `Insufficient reserved stock for lot ${lotId}`
      );
    }

    lot.currentQty = currentQty - quantity;
    lot.onRouteReservedQty =
      reservedQty - quantity;

    lot.hasMovement = true;
    lot.lastMovementAt = movementDate;

    deliveredAllocations.push({
      lotId: lot._id,
      lotNumber: reserved.lotNumber ?? null,
      quantity,
      unitCost: Number(reserved.unitCost),
      expirationDate:
        reserved.expirationDate ?? null,
    });

    remaining -= quantity;
  }

  if (remaining !== 0) {
    throw new Error(
      `Unable to consume all delivered units. ` +
      `Remaining: ${remaining}`
    );
  }

  return deliveredAllocations;
}
