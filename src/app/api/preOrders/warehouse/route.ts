import { connectToDatabase } from "@/lib/db";

import PreOrder from "@/models/PreOrder";
import User from "@/models/User";
import Client from "@/models/Client";

import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import {
  normalizeInventoryLocation,
} from "@/utils/inventoryResolver";


export async function GET(req: Request) {

  try {

    await connectToDatabase();


    // ==================================================
    // AUTHENTICATED USER
    // ==================================================

    const session =
      await getServerSession(authOptions);


    if (!session?.user?.id) {

      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );

    }


    const user =
      await User.findById(
        session.user.id
      )
        .select(
          "location userRole"
        )
        .lean();


    if (!user) {

      return NextResponse.json(
        {
          error: "User not found",
        },
        {
          status: 404,
        }
      );

    }


    // ==================================================
    // PERMISSIONS
    // ==================================================

    if (
      ![
        "admin",
        "warehouse",
      ].includes(user.userRole)
    ) {

      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );

    }


    // ==================================================
    // USER INVENTORY LOCATION
    //
    // undefined / null -> phoenix
    // ==================================================

    const inventoryLocation =
      normalizeInventoryLocation(
        user.location
      );


    // ==================================================
    // QUERY PARAMS
    // ==================================================

    const { searchParams } =
      new URL(req.url);


    const routeId =
      searchParams.get(
        "routeAssigned"
      );


    const page =
      Math.max(
        Number(
          searchParams.get(
            "page"
          )
        ) || 1,
        1
      );


    const limit =
      Math.min(
        Number(
          searchParams.get(
            "limit"
          )
        ) || 25,
        100
      );


    const search =
      searchParams
        .get("search")
        ?.trim() ||
      "";


    // ==================================================
    // BASE QUERY
    // ==================================================

    const query: any = {

      routeAssigned: {
        $ne: null,
      },

      status: {
        $in: [
          "assigned",
          "ready",
        ],
      },

    };


    // ==================================================
    // INVENTORY LOCATION FILTER
    // ==================================================
    //
    // Foreign:
    //
    // inventoryLocation: "yuma"
    //
    // Phoenix:
    //
    // Also allow old preorders created before
    // inventoryLocation existed.
    // ==================================================

    if (
      inventoryLocation ===
      "phoenix"
    ) {

      query.$and = [
        {
          $or: [
            {
              inventoryLocation:
                "phoenix",
            },

            {
              inventoryLocation: {
                $exists: false,
              },
            },

            {
              inventoryLocation:
                null,
            },
          ],
        },
      ];

    } else {

      query.inventoryLocation =
        inventoryLocation;

    }


    // ==================================================
    // ROUTE FILTER
    // ==================================================

    if (routeId) {

      query.routeAssigned =
        routeId;

    }


    // ==================================================
    // SEARCH
    // ==================================================
    //
    // Your old code searched:
    //
    // { name: regex }
    //
    // But PreOrder does not have a "name" field.
    //
    // Search invoice number + client name instead.
    // ==================================================

    if (search) {

      const matchingClients =
        await Client.find({
          clientName: {
            $regex: search,
            $options: "i",
          },
        })
          .select("_id")
          .lean();


      const clientIds =
        matchingClients.map(
          (client: any) =>
            client._id
        );


      const searchCondition = {
        $or: [
          {
            number: {
              $regex: search,
              $options: "i",
            },
          },

          {
            client: {
              $in: clientIds,
            },
          },
        ],
      };


      if (!query.$and) {
        query.$and = [];
      }


      query.$and.push(
        searchCondition
      );

    }


    // ==================================================
    // QUERY
    // ==================================================

    const [
      items,
      total,
    ] =
      await Promise.all([

        PreOrder.find(
          query
        )

          .populate(
            "client",
            "clientName"
          )

          .populate({
            path:
              "routeAssigned",

            populate: {
              path: "user",

              select:
                "firstName lastName username location",
            },
          })


          // ==================================================
          // POLYMORPHIC INVENTORY
          //
          // With your refPath implementation this can now
          // populate either:
          //
          // ProductInventory
          //
          // OR
          //
          // ForeignInventory
          // ==================================================

          .populate({
            path:
              "products.productInventory",

            populate: {
              path:
                "product",

              populate: [
                {
                  path:
                    "brand",
                },
                {
                  path:
                    "productType",
                },
              ],
            },
          })


          .populate(
            "cancelledBy"
          )


          .populate(
            "assembledBy",
            "firstName lastName"
          )


          .sort({
            status: 1,
            assembledAt: -1,
            createdAt: 1,
          })


          .skip(
            (page - 1) *
              limit
          )


          // Your old API was missing this
          .limit(
            limit
          )


          .lean(),


        // IMPORTANT:
        // Use the same query here.
        //
        // Your previous endpoint was counting
        // every preorder in the database.
        PreOrder.countDocuments(
          query
        ),

      ]);


    // ==================================================
    // RESPONSE
    // ==================================================

    return NextResponse.json({

      items,

      total,

      page,

      limit,

      // Useful for debugging / UI
      inventoryLocation,

    });


  } catch (err: any) {

    console.error(
      "WAREHOUSE PREORDERS ERROR:",
      err
    );


    return NextResponse.json(
      {
        error:
          err.message ||
          "Failed to load warehouse preorders",
      },
      {
        status: 500,
      }
    );

  }

}