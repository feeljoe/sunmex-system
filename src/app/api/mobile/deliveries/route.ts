import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";
import { connectToDatabase } from "@/lib/db";

import PreOrder from "@/models/PreOrder";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";

import {
  getInventoryModel,
  normalizeInventoryLocation,
} from "@/utils/inventoryResolver";

import { DateTime } from "luxon";


function addBusinessDays(
  date: DateTime,
  days: number
): DateTime {

  let result = date;

  const increment =
    days >= 0 ? 1 : -1;

  let remaining =
    Math.abs(days);


  while (remaining > 0) {

    result =
      result.plus({
        days: increment,
      });


    const weekday =
      result.weekday;


    // Monday - Friday
    if (
      weekday >= 1 &&
      weekday <= 5
    ) {
      remaining--;
    }

  }


  return result;
}


export async function GET(
  req: Request
) {

  try {

    // ==================================================
    // DATABASE
    // ==================================================

    await connectToDatabase();


    // ==================================================
    // AUTH
    // ==================================================

    const user =
      await authenticateMobile(
        req
      );


    if (
      user.userRole !==
      "driver"
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
    // DRIVER ROUTE
    // ==================================================

    const route =
      await Route.findOne({
        type: "driver",
        user: user._id,
      })
        .populate(
          "user",
          "firstName lastName"
        )
        .lean();


    if (!route) {

      console.log(
        "MOBILE DELIVERIES: No driver route found",
        {
          userId:
            user._id?.toString(),
        }
      );


      return NextResponse.json({
        deliveries: [],
      });

    }


    // ==================================================
    // DATES
    // ==================================================

    const phoenixNow =
      DateTime.now()
        .setZone(
          "America/Phoenix"
        );


    // Standalone credit memos are picked up
    // based on your existing 2-business-day rule.

    const pickUpDay =
      addBusinessDays(
        phoenixNow,
        -2
      );


    const startOfPickUpDay =
      pickUpDay
        .startOf("day")
        .toUTC()
        .toJSDate();


    const endOfPickUpDay =
      pickUpDay
        .endOf("day")
        .toUTC()
        .toJSDate();


    const startOfToday =
      phoenixNow
        .startOf("day")
        .toUTC()
        .toJSDate();


    const endOfToday =
      phoenixNow
        .endOf("day")
        .toUTC()
        .toJSDate();


    console.log(
      "MOBILE DELIVERIES REQUEST:",
      {
        userId:
          user._id?.toString(),

        routeId:
          route._id?.toString(),

        routeCode:
          route.code,

        today:
          phoenixNow.toFormat(
            "yyyy-MM-dd"
          ),

        startOfToday,
        endOfToday,
      }
    );


    // ==================================================
    // ORDERS
    // ==================================================
    //
    // IMPORTANT:
    //
    // Do NOT populate products.productInventory here.
    //
    // We will resolve that manually below according to
    // order.inventoryLocation.
    //
    // This makes this endpoint safe for:
    //
    // ProductInventory
    // ForeignInventory
    // legacy Phoenix orders
    //
    // ==================================================

    const orders =
      await PreOrder.find({

        routeAssigned:
          route._id,

        deliveryDate: {
          $gte:
            startOfToday,

          $lte:
            endOfToday,
        },

        status: {
          $in: [
            "ready",
            "delivered",
          ],
        },

      })

        .populate({
          path: "client",

          populate: {
            path:
              "paymentTerm",
          },
        })

        .populate({
          path:
            "routeAssigned",

          populate: {
            path: "user",

            select:
              "firstName lastName",
          },
        })

        .lean();


    console.log(
      `MOBILE DELIVERIES: Found ${orders.length} preorder(s) for route ${route.code}`
    );


    // ==================================================
    // CREDIT MEMOS ASSOCIATED WITH ORDERS
    // ==================================================

    const orderIds =
      orders.map(
        (order: any) =>
          order._id
      );


    const creditMemos =
      orderIds.length > 0

        ? await CreditMemo.find({

            preorder: {
              $in:
                orderIds,
            },

            routeAssigned:
              route._id,

          })

            .populate({
              path:
                "products.product",

              populate: {
                path:
                  "brand",
              },
            })

            .lean()

        : [];


    const creditMemoMap =
      new Map<
        string,
        any
      >();


    creditMemos.forEach(
      (creditMemo: any) => {

        if (
          creditMemo.preorder
        ) {

          creditMemoMap.set(
            creditMemo.preorder.toString(),
            creditMemo
          );

        }

      }
    );


    // ==================================================
    // STANDALONE CREDIT MEMOS
    // ==================================================

    const standaloneCreditMemos =
      await CreditMemo.find({

        routeAssigned:
          route._id,

        status: {
          $in: [
            "pending",
            "received",
          ],
        },

        $or: [
          {
            preorder: {
              $exists: false,
            },
          },

          {
            preorder:
              null,
          },
        ],

        createdAt: {
          $gte:
            startOfPickUpDay,

          $lte:
            endOfPickUpDay,
        },

      })

        .populate({
          path:
            "client",
        })

        .populate({
          path:
            "products.product",

          populate: {
            path:
              "brand",
          },
        })

        .populate({
          path:
            "routeAssigned",

          populate: {
            path: "user",

            select:
              "firstName lastName",
          },
        })

        .lean();


    // ==================================================
    // FORMAT STANDALONE CREDIT MEMOS
    // ==================================================

    const formattedStandalone =
      standaloneCreditMemos

        .map(
          (
            creditMemo:
              any
          ) => {

            // ------------------------------------------
            // INVALID CLIENT
            // ------------------------------------------

            if (
              !creditMemo.client
            ) {

              console.error(
                "MOBILE DELIVERIES: Credit memo has missing client",
                {
                  creditMemoId:
                    creditMemo._id,

                  number:
                    creditMemo.number,
                }
              );


              return null;

            }


            // ------------------------------------------
            // PRODUCTS
            // ------------------------------------------

            const products =
              (
                creditMemo.products ||
                []
              )

                .map(
                  (
                    line: any
                  ) => {

                    const product =
                      line.product;


                    if (!product) {

                      console.error(
                        "MOBILE DELIVERIES: Credit memo has missing product",
                        {
                          creditMemo:
                            creditMemo.number,

                          creditMemoId:
                            creditMemo._id,

                          lineId:
                            line._id,
                        }
                      );


                      return null;

                    }


                    return {

                      productId:
                        product._id,

                      upc:
                        product.upc,

                      sku:
                        product.sku,

                      name:
                        product.name,

                      brand:
                        product.brand
                          ?.name,

                      weight:
                        product.weight ??
                        "",

                      uom:
                        product.unit ??
                        "",

                      quantity:
                        Number(
                          line.quantity ||
                            0
                        ),

                      deliveredQuantity:
                        Number(
                          line.deliveredQuantity ||
                            0
                        ),

                      unitPrice:
                        Number(
                          line.unitPrice ||
                            line.actualCost ||
                            0
                        ),

                      returnReason:
                        line.returnReason,

                    };

                  }
                )

                .filter(
                  Boolean
                );


            // ------------------------------------------
            // ROUTE USER FALLBACK
            // ------------------------------------------

            const routeUser =
              creditMemo
                .routeAssigned
                ?.user;


            return {

              orderId:
                null,

              creditMemoId:
                creditMemo._id,

              number:
                creditMemo.number,

              status:
                creditMemo.status,

              inventoryLocation:
                creditMemo.inventoryLocation ||
                "phoenix",


              client: {

                id:
                  creditMemo
                    .client
                    ._id,

                name:
                  creditMemo
                    .client
                    .clientName,

                billingAddress:
                  creditMemo
                    .client
                    .billingAddress,

              },


              totals: {

                subtotal:
                  creditMemo.subtotal,

                total:
                  creditMemo.total,

              },


              requiresPayment:
                false,


              payments: [],


              routeAssigned: {

                _id:
                  creditMemo
                    .routeAssigned
                    ?._id ||
                  route._id,

                code:
                  creditMemo
                    .routeAssigned
                    ?.code ||
                  route.code,

                user:
                  routeUser

                    ? {
                        _id:
                          routeUser._id,

                        name:
                          `${routeUser.firstName || ""} ${routeUser.lastName || ""}`.trim(),
                      }

                    : {
                        _id:
                          user._id,

                        name:
                          `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                      },

              },


              products,


              creditMemo,

            };

          }
        )

        .filter(
          Boolean
        );


    // ==================================================
    // FORMAT PREORDERS
    // ==================================================

    const formattedOrders:
      any[] = [];


    for (
      const order of orders
    ) {

      try {

        // ================================================
        // CLIENT CHECK
        // ================================================

        if (
          !order.client
        ) {

          console.error(
            "MOBILE DELIVERIES: Preorder has missing client",
            {
              preorderId:
                order._id,

              number:
                order.number,
            }
          );


          // Don't kill the entire route.
          continue;

        }


        // ================================================
        // INVENTORY LOCATION
        // ================================================

        const inventoryLocation =
          normalizeInventoryLocation(
            order.inventoryLocation
          );


        const InventoryModel =
          getInventoryModel(
            inventoryLocation
          );


        // ================================================
        // GET INVENTORY IDS
        // ================================================

        const inventoryIds =
          (
            order.products ||
            []
          )

            .map(
              (line: any) => {

                const value =
                  line.productInventory;


                if (!value) {
                  return null;
                }


                if (
                  typeof value ===
                  "object"
                ) {

                  return (
                    value._id ||
                    null
                  );

                }


                return value;

              }
            )

            .filter(
              Boolean
            );


        // ================================================
        // LOAD INVENTORY FROM CORRECT COLLECTION
        // ================================================

        const inventoryRecords =
          inventoryIds.length >
          0

            ? await InventoryModel
                .find({
                  _id: {
                    $in:
                      inventoryIds,
                  },
                })

                .populate({
                  path:
                    "product",

                  populate: {
                    path:
                      "brand",
                  },
                })

                .lean()

            : [];


        // ================================================
        // INVENTORY MAP
        // ================================================

        const inventoryMap =
          new Map<
            string,
            any
          >();


        inventoryRecords.forEach(
          (
            inventory:
              any
          ) => {

            inventoryMap.set(
              inventory._id.toString(),
              inventory
            );

          }
        );


        // ================================================
        // FORMAT PRODUCTS
        // ================================================

        const products =
          (
            order.products ||
            []
          )

            .map(
              (
                line: any
              ) => {

                const inventoryId =
                  typeof line.productInventory ===
                  "object"

                    ? line.productInventory
                        ?._id
                        ?.toString()

                    : line.productInventory
                        ?.toString();


                if (
                  !inventoryId
                ) {

                  console.error(
                    "MOBILE DELIVERIES: Missing inventory ID",
                    {
                      preorder:
                        order.number,

                      preorderId:
                        order._id,

                      inventoryLocation,

                      lineId:
                        line._id,

                      inventoryModel:
                        line.inventoryModel,
                    }
                  );


                  return null;

                }


                const inventory =
                  inventoryMap.get(
                    inventoryId
                  );


                if (
                  !inventory
                ) {

                  console.error(
                    "MOBILE DELIVERIES: Inventory record not found",
                    {
                      preorder:
                        order.number,

                      preorderId:
                        order._id,

                      inventoryLocation,

                      expectedModel:
                        inventoryLocation ===
                        "phoenix"
                          ? "ProductInventory"
                          : "ForeignInventory",

                      inventoryId,

                      savedInventoryModel:
                        line.inventoryModel,
                    }
                  );


                  return null;

                }


                const product =
                  inventory.product;


                if (!product) {

                  console.error(
                    "MOBILE DELIVERIES: Inventory record has no product",
                    {
                      preorder:
                        order.number,

                      preorderId:
                        order._id,

                      inventoryLocation,

                      inventoryId,
                    }
                  );


                  return null;

                }


                const picked =
                  Math.round(
                    Number(
                      line.pickedQuantity ||
                        0
                    )
                  );


                return {

                  productInventory:
                    inventory._id,

                  productId:
                    product._id,

                  sku:
                    product.sku,

                  upc:
                    product.upc,

                  name:
                    product.name,

                  brand:
                    product.brand
                      ?.name,

                  weight:
                    product.weight ??
                    "",

                  uom:
                    product.unit ??
                    "",

                  // DRIVER SEES PICKED QUANTITY
                  quantity:
                    picked,

                  deliveredQuantity:
                    Math.round(
                      Number(
                        line.deliveredQuantity ||
                          0
                      )
                    ),

                  unitPrice:
                    Number(
                      line.actualCost ||
                        0
                    ),

                };

              }
            )

            // Remove malformed inventory lines
            // and zero-picked products.
            .filter(
              (
                product:
                  any
              ) =>
                product !==
                  null &&
                product.quantity >
                  0
            );


        // ================================================
        // IMPORTANT
        //
        // Don't hide the entire store simply because one
        // bad product line exists.
        // ================================================

        if (
          products.length ===
            0 &&
          (
            order.products ||
            []
          ).length > 0
        ) {

          console.warn(
            "MOBILE DELIVERIES: Order has no valid picked products",
            {
              preorder:
                order.number,

              preorderId:
                order._id,

              inventoryLocation,

              rawProductCount:
                order.products
                  ?.length,
            }
          );

        }


        // ================================================
        // CREDIT MEMO
        // ================================================

        const creditMemo =
          creditMemoMap.get(
            order._id.toString()
          );


        // ================================================
        // ROUTE INFORMATION
        // ================================================

        const assignedRoute =
          order.routeAssigned;


        const routeUser =
          assignedRoute?.user;


        // ================================================
        // FINAL ORDER
        // ================================================

        formattedOrders.push({

          orderId:
            order._id,

          number:
            order.number,

          status:
            order.status,

          inventoryLocation,


          client: {

            id:
              order.client._id,

            name:
              order.client
                .clientName,

            billingAddress:
              order.client
                .billingAddress,

          },


          totals: {

            subtotal:
              order.subtotal,

            total:
              order.total,

          },


          requiresPayment:
            order.client
              .paymentTerm
              ?.name ===
            "Due on Receipt",


          payments:
            order.payments ??
            [],


          routeAssigned: {

            _id:
              assignedRoute
                ?._id ||
              route._id,

            code:
              assignedRoute
                ?.code ||
              route.code,

            user:
              routeUser

                ? {
                    _id:
                      routeUser._id,

                    name:
                      `${routeUser.firstName || ""} ${routeUser.lastName || ""}`.trim(),
                  }

                : {
                    _id:
                      user._id,

                    name:
                      `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                  },

          },


          products,


          creditMemo:
            creditMemo ??
            null,

        });


      } catch (
        orderError:
          any
      ) {

        // =================================================
        // ONE BAD ORDER MUST NOT KILL THE DRIVER'S ROUTE
        // =================================================

        console.error(
          "MOBILE DELIVERIES: Failed formatting individual preorder",
          {
            preorderId:
              order?._id,

            number:
              order?.number,

            inventoryLocation:
              order?.inventoryLocation,

            error:
              orderError
                ?.message,
          }
        );

      }

    }


    // ==================================================
    // DEBUG SUMMARY
    // ==================================================

    console.log(
      "MOBILE DELIVERIES RESPONSE:",
      {
        driver:
          `${user.firstName || ""} ${user.lastName || ""}`.trim(),

        route:
          route.code,

        databaseOrders:
          orders.length,

        formattedOrders:
          formattedOrders.length,

        standaloneCreditMemos:
          formattedStandalone.length,
      }
    );


    // ==================================================
    // RESPONSE
    // ==================================================
    return NextResponse.json({
      deliveries: [
        ...formattedOrders,
        ...formattedStandalone,
      ],
    });
  } catch (
    err: any
  ) {
    console.error(
      "MOBILE DELIVERIES ERROR:",
      err
    );
    console.error(
      "MOBILE DELIVERIES ERROR MESSAGE:",
      err?.message
    );
    console.error(
      "MOBILE DELIVERIES ERROR STACK:",
      err?.stack
    );
    if (
      err.message ===
      "Unauthorized"
    ) {
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
    return NextResponse.json(
      {
        error:
          err.message ||
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}