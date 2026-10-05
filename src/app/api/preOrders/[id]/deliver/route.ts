import {
  connectToDatabase,
} from "@/lib/db";

import PreOrder from "@/models/PreOrder";

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

      let remainingToCost =
        deliveredQty;


      let itemCogsCents =
        0;


      // FIFO LOTS
      if (
        inventory.lots &&
        inventory.lots.length >
          0
      ) {

        inventory.lots.sort(
          (
            a: any,
            b: any
          ) =>
            new Date(
              a.receivedAt
            ).getTime() -
            new Date(
              b.receivedAt
            ).getTime()
        );


        for (
          const lot of inventory.lots
        ) {

          if (
            remainingToCost <=
            0
          ) {
            break;
          }


          if (
            Number(
              lot.currentQty ||
                0
            ) >
            0
          ) {

            const qtyToTake =
              Math.min(
                Number(
                  lot.currentQty ||
                    0
                ),
                remainingToCost
              );


            itemCogsCents +=
              toCents(
                qtyToTake *
                  Number(
                    lot.cost ||
                      0
                  )
              );


            lot.currentQty -=
              qtyToTake;


            remainingToCost -=
              qtyToTake;

          }

        }

      }


      // =================================================
      // FALLBACK COST
      //
      // Important for ForeignInventory right now because
      // transfers may not yet be moving lot data.
      // =================================================

      if (
        remainingToCost >
        0
      ) {

        const fallbackCost =
          Number(
            inventory.product
              ?.unitCost ||
              0
          );


        itemCogsCents +=
          toCents(
            remainingToCost *
              fallbackCost
          );

      }


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
          line.actualCost ||
            line
              .productInventory
              ?.product
              ?.unitPrice ||
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