import {
  connectToDatabase,
} from "@/lib/db";

import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";

import {
  getInventoryModel,
  normalizeInventoryLocation,
} from "@/utils/inventoryResolver";

import mongoose from "mongoose";

import {
  NextResponse,
} from "next/server";


const toCents = (
  value: number
) =>
  Math.round(
    value * 100
  );


const fromCents = (
  cents: number
) =>
  Number(
    (cents / 100).toFixed(
      2
    )
  );

const ALLOW_LEGACY_PREORDER_DELIVERY = true;

export async function PATCH(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  await connectToDatabase();


  const { id } =
    await context.params;


  const session =
    await mongoose.startSession();


  session.startTransaction();


  try {

    // ==================================================
    // BODY
    // ==================================================

    const {
      signature,
      products,
    } =
      await req.json();

    if (typeof signature !== "string" || !signature.startsWith("data:image/") || signature.length < 100) {
      throw new Error("A valid customer signature is required");
    }


    if (
      !Array.isArray(
        products
      )
    ) {

      throw new Error(
        "Products are required"
      );

    }


    // ==================================================
    // PREORDER
    // ==================================================

    const preorder =
      await PreOrder.findById(
        id
      )

        .populate({
          path:
            "products.productInventory",

          populate: {
            path:
              "product",
          },
        })


        .populate({
          path:
            "routeAssigned",
        })


        .session(
          session
        );


    if (!preorder) {

      throw new Error(
        "Preorder not found"
      );

    }


    if (
      preorder.status !==
      "ready"
    ) {

      throw new Error(
        "Preorder not ready for delivery"
      );

    }

    const linkedCreditMemo = await CreditMemo.findOne({
      preorder: preorder._id,
    }).session(session);
    if (linkedCreditMemo) {
      if (String(linkedCreditMemo.client) !== String(preorder.client)) {
        throw new Error("Credit memo and Preorder client mismatch");
      }
      if (linkedCreditMemo.status === "pending") {
        throw new Error("Receive the linked credit memo before delivering this Preorder");
      }
      if (linkedCreditMemo.status === "cancelled") {

      } else if (linkedCreditMemo.status !== "received") {
        throw new Error("Linked Credit Memo has an unexpected status");
      }
    }


    // ==================================================
    // INVENTORY LOCATION
    // ==================================================

    const inventoryLocation =
      normalizeInventoryLocation(
        preorder.inventoryLocation
      );


    const isForeignInventory =
      inventoryLocation !==
      "phoenix";


    const InventoryModel =
      getInventoryModel(
        inventoryLocation
      );


    // ==================================================
    // APPLY DRIVER COUNTS TO PREORDER
    // ==================================================

    for (
      const line of preorder.products
    ) {

      const lineInventoryId =
        typeof line.productInventory ===
          "object"
          ? line.productInventory
            ?._id
            ?.toString()
          : line.productInventory
            ?.toString();


      if (!lineInventoryId) {
        throw new Error(
          "Preorder contains an invalid inventory reference"
        );
      }


      const update =
        products.find(
          (incoming: any) => {

            const incomingId =
              typeof incoming.productInventory ===
                "object"
                ? incoming
                  .productInventory
                  ?._id
                  ?.toString()
                : incoming
                  .productInventory
                  ?.toString();


            return (
              incomingId ===
              lineInventoryId
            );

          }
        );


      if (update) {

        line.deliveredQuantity =
          Math.round(
            Number(
              update.deliveredQuantity ||
              0
            )
          );


        line.deviationReason =
          update.deviationReason ??
          null;

      } else {

        // If the driver did not send this line,
        // consider it zero delivered rather than
        // retaining stale data.

        line.deliveredQuantity =
          0;

      }

    }


    // ==================================================
    // TOTALS
    // ==================================================

    let newTotalCents =
      0;


    let newCogsCents =
      0;


    // ==================================================
    // PROCESS EACH PRODUCT
    // ==================================================

    for (
      const line of preorder.products
    ) {

      const inventoryId =
        typeof line.productInventory ===
          "object"
          ? line.productInventory._id
          : line.productInventory;


      // =================================================
      // LOAD CORRECT INVENTORY
      //
      // Phoenix:
      // ProductInventory
      //
      // Foreign:
      // ForeignInventory
      // =================================================

      const inventory =
        await InventoryModel
          .findById(
            inventoryId
          )

          .populate({
            path:
              "product",

            populate: {
              path:
                "brand",
            },
          })

          .session(
            session
          );


      if (!inventory) {

        throw new Error(
          "Inventory Not Found"
        );

      }


      // =================================================
      // EXTRA FOREIGN SAFETY CHECK
      // =================================================

      if (
        isForeignInventory &&
        inventory.location !==
        inventoryLocation
      ) {

        throw new Error(
          `Inventory belongs to ${inventory.location}, but preorder belongs to ${inventoryLocation}`
        );

      }


      // =================================================
      // QUANTITIES
      // =================================================

      const deliveredQty =
        Math.round(
          Number(
            line.deliveredQuantity ||
            0
          )
        );


      const pickedQty =
        Math.round(
          Number(
            line.pickedQuantity ||
            0
          )
        );


      // =================================================
      // VALIDATE DELIVERED QUANTITY
      // =================================================

      if (
        deliveredQty < 0
      ) {

        throw new Error(
          `Delivered quantity cannot be negative for ${inventory.product?.name}`
        );

      }


      // IMPORTANT:
      //
      // Driver cannot deliver more than warehouse
      // actually assembled.
      if (
        deliveredQty >
        pickedQty
      ) {

        throw new Error(
          `Delivered quantity cannot exceed picked quantity for ` +
          `${inventory.product?.brand?.name || ""} ` +
          `${inventory.product?.name || ""}. ` +
          `Picked: ${pickedQty}, Delivered: ${deliveredQty}`
        );

      }


      // =================================================
      // ON-ROUTE INVENTORY
      // =================================================

      const onRouteAvailable =
        Number(
          inventory.onRouteInventory ||
          0
        );


      if (
        onRouteAvailable <
        deliveredQty
      ) {

        throw new Error(
          `Insufficient on-route inventory for ` +
          `${inventory.product?.brand?.name || ""} ` +
          `${inventory.product?.name || ""} ` +
          `${inventory.product?.weight || ""}` +
          `${inventory.product?.unit?.toUpperCase() || ""}. ` +
          `Available: ${onRouteAvailable}, ` +
          `Attempted: ${deliveredQty}`
        );

      }


      // =================================================
      // COGS
      // =================================================


      let itemCogsCents = 0;
      let remainingToDeliver = deliveredQty;

      const productName = [
        inventory.product?.brand?.name,
        inventory.product?.name,
        inventory.product?.weight
          ? `${inventory.product.weight}${inventory.product?.unit ?? ""}`
          : "",
      ].filter(Boolean).join(" ");

      const deliveredAllocations: any[] = [];

      const pickedAllocations =
        line.pickedLotAllocations ?? [];

      const hasPickedAllocations =
        pickedAllocations.length > 0;

      // =================================================
      // LEGACY PREORDER FALLBACK
      // =================================================
      //
      // Older preorders were prepared before lot-level
      // reservations existed.
      //
      // Their aggregate inventory was already moved from
      // preSavedInventory to onRouteInventory.
      //
      // We allow those orders to be delivered without
      // inventing historical lot IDs.
      //
      // IMPORTANT:
      // - Do not deduct inventory.lots[].currentQty.
      // - Do not deduct onRouteReservedQty.
      // - Aggregate onRouteInventory is still deducted
      //   in the existing INVENTORY MOVEMENT section.
      // =================================================

      if (!hasPickedAllocations && pickedQty > 0) {
        if (!ALLOW_LEGACY_PREORDER_DELIVERY) {
          throw new Error(
            `Preorder ${preorder.number}: ${productName} ` +
            "has no picked lot allocations. " +
            "Legacy delivery compatibility is disabled."
          );
        }

        const fallbackUnitCost = Number(
          inventory.product?.unitCost
        );

        if (
          !Number.isFinite(fallbackUnitCost) ||
          fallbackUnitCost < 0
        ) {
          throw new Error(
            `Preorder ${preorder.number}: unable to calculate ` +
            `historical cost for ${productName}. ` +
            "Product unitCost is missing or invalid."
          );
        }

        if (deliveredQty > 0) {
          deliveredAllocations.push({
            lotNumber: null,
            quantity: deliveredQty,
            unitCost: fallbackUnitCost,
            expirationDate: null,
            inventoryLocation,
            lotMatchMethod: "fallback",
          });

          itemCogsCents = toCents(
            deliveredQty * fallbackUnitCost
          );
        }

        remainingToDeliver = 0;

        console.warn(
          "LEGACY PREORDER DELIVERY:",
          {
            preorder: preorder.number,
            product: String(inventory.product?._id),
            inventoryLocation,
            pickedQty,
            deliveredQty,
            fallbackUnitCost,
          }
        );
      }

      // =================================================
      // MODERN LOT-TRACKED PREORDER
      // =================================================
      //
      // If picked allocations exist, maintain strict
      // validation. Never use the fallback to bypass an
      // incomplete or inconsistent allocation.
      // =================================================

      else if (hasPickedAllocations) {
        const pickedAllocatedQty = pickedAllocations.reduce(
          (sum: number, allocation: any) =>
            sum + Number(allocation.quantity ?? 0),
          0
        );

        if (pickedAllocatedQty !== pickedQty) {
          throw new Error(
            `Picked lot allocation mismatch for ${productName}. ` +
            `Picked: ${pickedQty}. ` +
            `Reserved: ${pickedAllocatedQty}`
          );
        }

        for (const allocation of pickedAllocations) {
          if (remainingToDeliver <= 0) break;

          const reservedQuantity = Number(
            allocation.quantity
          );

          if (
            !Number.isSafeInteger(reservedQuantity) ||
            reservedQuantity < 0
          ) {
            throw new Error(
              `Invalid reserved lot quantity for ${productName}`
            );
          }

          const quantityToDeliver = Math.min(
            reservedQuantity,
            remainingToDeliver
          );

          if (quantityToDeliver <= 0) continue;

          const unitCost = Number(allocation.unitCost);

          if (
            !Number.isFinite(unitCost) ||
            unitCost < 0
          ) {
            throw new Error(
              `Invalid historical lot cost for ${productName}`
            );
          }

          const allocationData = {
            lotId: allocation.lotId ?? undefined,
            lotNumber: allocation.lotNumber ?? null,
            quantity: quantityToDeliver,
            unitCost,
            expirationDate:
              allocation.expirationDate ?? null,
            inventoryLocation,
            lotMatchMethod: allocation.lotMatchMethod,
          };

          if (allocation.lotId) {
            const lot = inventory.lots.id(
              allocation.lotId
            );

            if (!lot) {
              throw new Error(
                `Reserved lot ${allocation.lotId} ` +
                `was not found for ${productName}`
              );
            }

            const currentQty = Number(
              lot.currentQty ?? 0
            );

            const reservedQty = Number(
              lot.onRouteReservedQty ?? 0
            );

            if (
              currentQty < quantityToDeliver ||
              reservedQty < quantityToDeliver
            ) {
              throw new Error(
                `Insufficient lot inventory for ${lot.lotNumber}. ` +
                `Current: ${currentQty}, ` +
                `Reserved: ${reservedQty}, ` +
                `Delivering: ${quantityToDeliver}`
              );
            }

            lot.currentQty -= quantityToDeliver;
            lot.onRouteReservedQty -= quantityToDeliver;

            lot.hasMovement = true;
            lot.lastMovementAt = new Date();
          } else if (
            allocation.lotMatchMethod !== "fallback"
          ) {
            throw new Error(
              `Reserved allocation is missing a lot ID ` +
              `for ${productName}`
            );
          }

          deliveredAllocations.push(allocationData);

          itemCogsCents += toCents(
            quantityToDeliver * unitCost
          );

          remainingToDeliver -= quantityToDeliver;
        }
      }

      // =================================================
      // FINAL VALIDATION
      // =================================================

      if (remainingToDeliver !== 0) {
        throw new Error(
          `Unable to allocate all delivered units ` +
          `for ${productName}. ` +
          `Remaining: ${remainingToDeliver}`
        );
      }

      line.lotAllocations = deliveredAllocations;


      // =================================================
      // INVENTORY MOVEMENT
      //
      // Warehouse complete already moved:
      //
      // preSaved -> onRoute
      //
      // Delivery consumes the delivered quantity:
      //
      // onRoute -> sold
      // =================================================

      inventory.onRouteInventory -=
        deliveredQty;


      await inventory.save({
        session,
      });


      // =================================================
      // REVENUE
      // =================================================

      const unitPrice =
        Number(
          line.actualCost ??
          line
            .productInventory
            ?.product
            ?.unitPrice ??
          0
        );


      newTotalCents +=
        toCents(
          deliveredQty *
          unitPrice
        );


      newCogsCents +=
        itemCogsCents;

    }


    // ==================================================
    // PREORDER TOTALS
    // ==================================================

    preorder.total =
      preorder.type ===
        "noCharge"
        ? 0
        : fromCents(
          newTotalCents
        );


    preorder.cogs =
      fromCents(
        newCogsCents
      );


    // ==================================================
    // DELIVERY
    // ==================================================

    preorder.status =
      "delivered";


    preorder.deliveredAt =
      new Date();


    preorder.deliveredBy =
      preorder.routeAssigned
        ?.user;


    preorder.deliverySignature =
      signature;

    if (linkedCreditMemo && linkedCreditMemo.status === "received") {
      if (linkedCreditMemo.returnSignature && linkedCreditMemo.returnSignature !== signature) {
        throw new Error("Credit Memo already has a different signature");
      }
      linkedCreditMemo.returnSignature = signature;
      await linkedCreditMemo.save({ session });
    }


    // ==================================================
    // SAVE
    // ==================================================

    await preorder.save({
      session,
    });


    await session.commitTransaction();


    return NextResponse.json({
      success: true,

      inventoryLocation,

      inventoryModel:
        isForeignInventory
          ? "ForeignInventory"
          : "ProductInventory",

      total:
        preorder.total,

      cogs:
        preorder.cogs,
    });


  } catch (err: any) {

    await session.abortTransaction();


    console.error(
      "DELIVER ERROR FULL:",
      err
    );


    console.error(
      "DELIVER ERROR MESSAGE:",
      err?.message
    );


    console.error(
      "DELIVER ERROR STACK:",
      err?.stack
    );


    return NextResponse.json(
      {
        error:
          err?.message ||
          "Unknown error during delivery",
      },
      {
        status: 400,
      }
    );


  } finally {

    await session.endSession();

  }

}