import { connectToDatabase } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const db = mongoose.connection.db!;

  try {
    const { searchParams } = new URL(req.url);

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const statusFilter = searchParams.get("status");
    const chainId = searchParams.get("chain");
    const vendorId = searchParams.get("vendor");

    const match: any = {
      status: "delivered",
    };

    if (from || to) {
      match.deliveredAt = {};
      if (from) {
        const fromDate = new Date(from + "T00:00:00");
        fromDate.setHours(0, 0, 0, 0);
        match.deliveredAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to + "T23:59:59.999");
        toDate.setHours(23, 59, 59, 999);
        match.deliveredAt.$lte = toDate;
      }
    }

    if (vendorId && vendorId !== "all") {
      match.createdBy = new mongoose.Types.ObjectId(vendorId);
    }

    const preorders = await db.collection("preorders").aggregate([
      { $match: match },

      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "client" }},
      { $unwind: "$client" },

      { $lookup: { from: "chains", localField: "client.chain", foreignField: "_id", as: "chain" }},
      { $unwind: { path: "$chain", preserveNullAndEmptyArrays: true }},

      ...(chainId && chainId !== "all"
        ? [{ $match: { "client.chain": new mongoose.Types.ObjectId(chainId) }}]
        : []),

      { $lookup: { from: "paymentterms", localField: "client.paymentTerm", foreignField: "_id", as: "paymentTerm" }},
      { $unwind: { path: "$paymentTerm", preserveNullAndEmptyArrays: true }},

      {
        $lookup: {
          from: "creditmemos",
          let: { preorderId: "$_id" },
          pipeline: [
            {
              $match: {
                status: "received",
                $expr: { $eq: ["$preorder", "$$preorderId"] },
              },
            },
          ],
          as: "credits",
        },
      },

      {
        $lookup: {
          from: "productinventories",
          localField: "products.productInventory",
          foreignField: "_id",
          as: "productInventories",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productInventories.product",
          foreignField: "_id",
          as: "productsData",
        },
      },
      // COGS
      {
        $addFields: {
          cogs: {
            $sum: {
              $map: {
                input: "$products",
                as: "p",
                in: {
                  $multiply: [
                    "$$p.quantity",
                    {
                      $let: {
                        vars: {
                          inv: {
                            $first: {
                              $filter: {
                                input: "$productInventories",
                                as: "pi",
                                cond: {
                                  $eq: ["$$pi._id", "$$p.productInventory"],
                                },
                              },
                            },
                          },
                        },
                        in: {
                          $let: {
                            vars: {
                              prod: {
                                $first: {
                                  $filter: {
                                    input: "$productsData",
                                    as: "pd",
                                    cond: {
                                      $eq: ["$$pd._id", "$$inv.product"],
                                    },
                                  },
                                },
                              },
                            },
                            in: { $ifNull: ["$$prod.unitCost", 0] },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },

      {
        $addFields: {
          isDSD: {
            $eq: [{ $toLower: "$chain.name" }, "dsd"],
          },
          creditTotal: {
            $cond: [
              { $eq: [{ $toLower: "$chain.name" }, "dsd"] },
              { $sum: "$credits.total" },
              0,
            ],
          },
          paidTotal: {
            $sum: {
              $map: {
                input: "$payments",
                as: "p",
                in: "$$p.amount",
              },
            },
          },
        },
      },

      {
        $addFields: {
          net: { $subtract: ["$total", "$creditTotal"] },
        },
      },

      {
        $addFields: {
          balance: {
            $max: [
              {
                $round: [
                  { $subtract: ["$net", "$paidTotal"] },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },

      {
        $addFields: {
          computedStatus: {
            $cond: [
              { $eq: ["$balance", 0] },
              "paid",
              {
                $cond: [
                  { $eq: ["$paymentTerm.dueDays", 0] },
                  "unpaid",
                  {
                    $cond: [
                      {
                        $lt: [
                          {
                            $add: [
                              "$deliveredAt",
                              {
                                $multiply: [
                                  "$paymentTerm.dueDays",
                                  86400000,
                                ],
                              },
                            ],
                          },
                          new Date(),
                        ],
                      },
                      "overdue",
                      "pending",
                    ],
                  }
                ],
              },
            ],
          },
        },
      },

      ...(statusFilter && statusFilter !== "all"
        ? [{ $match: { computedStatus: statusFilter } }]
        : []),

      {
        $project: {
          number: 1,
          deliveredAt: 1,
          total: 1,
          credits: "$creditTotal",
          paid: "$paidTotal",
          balance: 1,
          computedStatus: 1,
          payments: 1,
          cogs: 1, // ✅ included
          isDSD: 1,
          client: {
            _id: "$client._id",
            name: "$client.clientName",
            chain: "$client.chain",
            paymentTerm: "$paymentTerm.name",
            discountPercentage: "$paymentTerm.discountPercentage",
          },
          products: 1,
            productInventories: 1,
            productsData: 1,
        },
      },

      { $sort: { deliveredAt: -1 } },
    ]).toArray();

    const creditMatch: any = { status: "received" };

    if (from || to) {
      creditMatch.returnedAt = {};
      if (from) creditMatch.returnedAt.$gte = new Date(from + "T00:00:00");
      if (to) creditMatch.returnedAt.$lte = new Date(to + "T23:59:59.999");
    }

    const creditMemos = await db.collection("creditmemos").aggregate([
      { $match: creditMatch },

      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: "$client" },

      {
        $lookup: {
          from: "chains",
          localField: "client.chain",
          foreignField: "_id",
          as: "chain",
        },
      },
      { $unwind: "$chain" },

      ...(chainId && chainId !== "all"
        ? [{ $match: { "client.chain": new mongoose.Types.ObjectId(chainId) }}]
        : []),

      ...(vendorId && vendorId !== "all"
        ? [{ $match: { vendor: new mongoose.Types.ObjectId(vendorId) }}]
        : []),

      {
        $match: {
          $expr: { $ne: [{ $toLower: "$chain.name" }, "dsd"] },
        },
      },
      {
        $lookup: {
          from: "paymentterms",
          localField: "client.paymentTerm",
          foreignField: "_id",
          as: "paymentTerm",
        },
      },
      {
        $unwind: {
          path: "$paymentTerm",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          number: 1,
          returnedAt: 1,
          total: 1,
          client: {
            clientName: "$client.clientName",
            chain: "$client.chain",
            paymentTerm: "$paymentTerm.name",
          },
        },
      },
    ]).toArray();

    return NextResponse.json({
      items: preorders,
      unlinkedCreditMemos: creditMemos,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}