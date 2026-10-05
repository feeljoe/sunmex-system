import {
  authOptions,
} from "@/lib/auth";

import {
  connectToDatabase,
} from "@/lib/db";

import PreOrder from "@/models/PreOrder";
import InventoryReview from "@/models/InventoryReview";
import User from "@/models/User";

import mongoose from "mongoose";

import {
  getServerSession,
} from "next-auth";

import {
  NextResponse,
} from "next/server";

import {
  getNextBusinessDay,
} from "@/utils/getNextBusinessDay";

import {
  DateTime,
} from "luxon";

import {
  getInventoryModel,
  normalizeInventoryLocation,
} from "@/utils/inventoryResolver";


export async function PATCH(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  await connectToDatabase();


  // ==================================================
  // AUTH
  // ==================================================

  const sessionUser =
    await getServerSession(
      authOptions
    );


  if (!sessionUser?.user?.id) {

    return NextResponse.json(
      {
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }


  const { id } =
    await context.params;


  const session =
    await mongoose.startSession();


  session.startTransaction();


  try {

    // ==================================================
    // USER
    // ==================================================

    const user =
      await User.findById(
        sessionUser.user.id
      )
        .select(
          "location userRole"
        )
        .session(
          session
        );


    if (!user) {
      throw new Error(
        "User not found"
      );
    }


    if (
      ![
        "admin",
        "warehouse",
      ].includes(
        user.userRole
      )
    ) {

      await session.abortTransaction();

      return NextResponse.json(
        {
          error:
            "Forbidden",
        },
        {
          status: 403,
        }
      );
    }


    // ==================================================
    // BODY
    // ==================================================

    const body =
      await req.json();


    const {
      products,
      isPartial,
    } = body;


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
    //
    // Do NOT populate productInventory here.
    //
    // We want the raw ID because we'll query the correct
    // collection manually using InventoryModel.
    // ==================================================

    const preorder =
      await PreOrder.findById(
        id
      ).session(
        session
      );


    if (!preorder) {
      throw new Error(
        "Preorder not found"
      );
    }


    if (
      preorder.status !==
        "pending" &&
      preorder.status !==
        "assigned"
    ) {

      throw new Error(
        "Preorder cannot be modified"
      );
    }


    // ==================================================
    // PREORDER INVENTORY LOCATION
    // ==================================================

    const inventoryLocation =
      normalizeInventoryLocation(
        preorder.inventoryLocation
      );


    const isForeignInventory =
      inventoryLocation !==
      "phoenix";


    // ==================================================
    // CURRENT USER LOCATION
    // ==================================================

    const userInventoryLocation =
      normalizeInventoryLocation(
        user.location
      );


    // ==================================================
    // LOCATION SECURITY
    // ==================================================
    //
    // It isn't enough to filter the frontend table.
    //
    // Someone could manually call:
    //
    // PATCH /api/preOrders/OTHER_LOCATION_ID/complete
    //
    // So enforce it here too.
    // ==================================================

    if (
      userInventoryLocation !==
      inventoryLocation
    ) {

      await session.abortTransaction();

      return NextResponse.json(
        {
          error:
            `This preorder belongs to ${inventoryLocation} inventory. Your warehouse location is ${userInventoryLocation}.`,
        },
        {
          status: 403,
        }
      );
    }


    // ==================================================
    // INVENTORY MODEL
    // ==================================================

    const InventoryModel =
      getInventoryModel(
        inventoryLocation
      );


    // ==================================================
    // PRODUCTS
    // ==================================================

    for (
      const update of products
    ) {

      // ----------------------------------------------
      // INVENTORY ID FROM CLIENT
      // ----------------------------------------------

      const inventoryId =
        typeof update.productInventory ===
        "string"
          ? update.productInventory
          : update
              .productInventory
              ?._id;


      if (!inventoryId) {
        throw new Error(
          "Inventory ID is missing"
        );
      }


      // ----------------------------------------------
      // FIND PREORDER LINE
      // ----------------------------------------------

      const line =
        preorder.products.find(
          (p: any) =>
            p.productInventory
              .toString() ===
            inventoryId.toString()
        );


      if (!line) {
        throw new Error(
          "Product does not belong to this preorder"
        );
      }


      // ----------------------------------------------
      // LOAD CORRECT INVENTORY COLLECTION
      // ----------------------------------------------

      const inventory =
        await InventoryModel
          .findById(
            inventoryId
          )

          .populate({
            path: "product",

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
          "Inventory record not found"
        );
      }


      // ----------------------------------------------
      // EXTRA FOREIGN LOCATION PROTECTION
      // ----------------------------------------------

      if (
        isForeignInventory &&
        inventory.location !==
          inventoryLocation
      ) {

        throw new Error(
          "Inventory record belongs to a different foreign location"
        );
      }


      // =================================================
      // DISPLAY NAME
      // =================================================

      const product =
        inventory.product;


      const brandName =
        product?.brand?.name ||
        "";


      const productName =
        product?.name ||
        "";


      const weight =
        product?.weight ||
        "";


      const unit =
        product?.unit ||
        "";


      const displayName =
        `${brandName} ${productName} ${weight}${unit}`.trim();


      // =================================================
      // QUANTITIES
      // =================================================

      const orderedQty =
        Math.round(
          Number(
            line.quantity ||
              0
          )
        );


      const pickedQty =
        Math.round(
          Number(
            update.pickedQuantity ||
              0
          )
        );


      const diffQty =
        orderedQty -
        pickedQty;


      // =================================================
      // VALIDATION
      // =================================================

      if (
        pickedQty < 0
      ) {

        throw new Error(
          `Picked quantity cannot be negative for ${displayName}`
        );
      }


      if (
        pickedQty >
        orderedQty
      ) {

        throw new Error(
          `Picked quantity cannot exceed ordered quantity for ${displayName}`
        );
      }


      if (
        diffQty > 0 &&
        !update.differenceReason
      ) {

        throw new Error(
          `A shortage reason is required for ${displayName}`
        );
      }


      // =================================================
      // PHOENIX DIFFERENCE AUTHORIZATION
      // =================================================
      //
      // Foreign inventory DOES NOT use AdminAuthorizationModal.
      // =================================================

      if (
        diffQty > 0 &&
        !isForeignInventory &&
        !update.authorizedBy
      ) {

        throw new Error(
          `Shortage for ${displayName} requires admin authorization`
        );
      }


      // =================================================
      // PARTIAL SAVE
      // =================================================
      //
      // Partial progress only updates the preorder.
      // No inventory moves yet.
      // =================================================

      if (isPartial) {

        line.pickedQuantity =
          pickedQty;


        line.differenceReason =
          diffQty > 0
            ? update.differenceReason
            : undefined;


        // Foreign does not carry admin authorization
        // for this workflow.

        if (
          !isForeignInventory &&
          update.authorizedBy
        ) {

          line.authorizedBy =
            new mongoose.Types.ObjectId(
              update.authorizedBy
            );

        }


        continue;
      }


      // =================================================
      // FULL COMPLETION
      // =================================================
      //
      // The entire ordered quantity is currently reserved:
      //
      // preSavedInventory = orderedQty
      //
      // Completing the warehouse operation resolves the
      // entire reservation:
      //
      // picked -> onRoute
      // shortage -> inactive
      //
      // Therefore we verify against orderedQty, not merely
      // pickedQty.
      // =================================================

      const availablePreSaved =
        Number(
          inventory.preSavedInventory ||
            0
        );


      if (
        availablePreSaved <
        orderedQty
      ) {

        throw new Error(
          `Insufficient pre-saved inventory for ${displayName}. ` +
          `Required: ${orderedQty}. ` +
          `Available: ${availablePreSaved}.`
        );
      }


      // =================================================
      // PICKED:
      //
      // preSaved -> onRoute
      // =================================================

      if (
        pickedQty > 0
      ) {

        inventory.preSavedInventory -=
          pickedQty;


        inventory.onRouteInventory +=
          pickedQty;

      }


      // =================================================
      // SHORTAGE:
      //
      // preSaved -> inactive
      //
      // This keeps the inventory ledger balanced.
      // =================================================

      if (
        diffQty > 0
      ) {

        inventory.preSavedInventory -=
          diffQty;


        inventory.inactiveInventory =
          Number(
            inventory.inactiveInventory ||
              0
          ) +
          diffQty;


        // ===============================================
        // PHOENIX INVENTORY REVIEW
        // ===============================================

        if (
          !isForeignInventory
        ) {

          await InventoryReview.create(
            [
              {
                product:
                  inventory.product
                    ?._id ||
                  inventory.product,

                quantity:
                  diffQty,

                differenceReason:
                  update.differenceReason,

                authorizedBy:
                  new mongoose.Types.ObjectId(
                    update.authorizedBy
                  ),

                generatedBy:
                  new mongoose.Types.ObjectId(
                    sessionUser.user.id
                  ),

                source:
                  preorder._id,

                status:
                  "pending",
              },
            ],
            {
              session,
            }
          );

        }


        // ===============================================
        // FOREIGN
        // ===============================================
        //
        // No InventoryReview is generated here.
        //
        // The shortage remains visible as:
        //
        // ForeignInventory.inactiveInventory
        //
        // so your future foreign-location management flow
        // can resolve it separately.
        // ===============================================

      }


      // =================================================
      // SAVE INVENTORY
      // =================================================

      await inventory.save({
        session,
      });


      // =================================================
      // SAVE PREORDER LINE
      // =================================================

      line.pickedQuantity =
        pickedQty;


      line.differenceReason =
        diffQty > 0
          ? update.differenceReason
          : undefined;


      line.authorizedBy =
        !isForeignInventory &&
        diffQty > 0 &&
        update.authorizedBy

          ? new mongoose.Types.ObjectId(
              update.authorizedBy
            )

          : undefined;

    }


    // ==================================================
    // COMPLETE PREORDER
    // ==================================================

    if (!isPartial) {

      const phoenixNow =
        DateTime.now()
          .setZone(
            "America/Phoenix"
          );


      const assembledAt =
        phoenixNow
          .toUTC()
          .toJSDate();


      // Do not trust assembledBy sent by the browser.
      // Use authenticated user.

      preorder.assembledBy =
        new mongoose.Types.ObjectId(
          sessionUser.user.id
        );


      preorder.assembledAt =
        assembledAt;


      preorder.deliveryDate =
        getNextBusinessDay(
          assembledAt
        );


      preorder.status =
        "ready";

    }


    // ==================================================
    // SAVE PREORDER
    // ==================================================

    preorder.updatedBy =
      new mongoose.Types.ObjectId(
        sessionUser.user.id
      );


    preorder.updatedAt =
      new Date();


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

      preorder,
    });


  } catch (err: any) {

    await session.abortTransaction();


    console.error(
      "COMPLETE PREORDER ERROR:",
      err
    );


    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to prepare preorder",
      },
      {
        status: 400,
      }
    );


  } finally {

    await session.endSession();

  }
}