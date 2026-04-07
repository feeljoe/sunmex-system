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

    // -----------------------------
    // DATE FILTER
    // -----------------------------
    if (from || to) {
      match.deliveredAt = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        match.deliveredAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        match.deliveredAt.$lte = toDate;
      }
    }

    // -----------------------------
    // VENDOR FILTER
    // -----------------------------
    if (vendorId && vendorId !== "all") {
      match.createdBy = new mongoose.Types.ObjectId(vendorId);
    }

    // =============================
    // PREORDERS PIPELINE
    // =============================
    const preorders = await db
      .collection("preorders")
      .aggregate([
        { $match: match },

        // CLIENT
        {
          $lookup: {
            from: "clients",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },

        // CHAIN
        {
          $lookup: {
            from: "chains",
            localField: "client.chain",
            foreignField: "_id",
            as: "chain",
          },
        },
        {
          $unwind: {
            path: "$chain",
            preserveNullAndEmptyArrays: true,
          },
        },

        // OPTIONAL CHAIN FILTER
        ...(chainId && chainId !== "all"
          ? [
              {
                $match: {
                  "client.chain": new mongoose.Types.ObjectId(chainId),
                },
              },
            ]
          : []),

        // PAYMENT TERM
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

        // CREDIT MEMOS (LINKED)
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

        // COMPUTE TOTALS (CONDITIONAL FOR DSD)
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

        // STATUS
        {
          $addFields: {
            computedStatus: {
              $cond: [
                { $eq: ["$balance", 0] },
                "paid",
                {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$paymentTerm.dueDays", 0] },
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
                      ],
                    },
                    "overdue",
                    "pending",
                  ],
                },
              ],
            },
          },
        },

        // STATUS FILTER
        ...(statusFilter && statusFilter !== "all"
          ? [{ $match: { computedStatus: statusFilter } }]
          : []),

        // FINAL SHAPE
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
            isDSD: 1,
            client: {
              _id: "$client._id",
              name: "$client.clientName",
              chain: "$client.chain",
              paymentTerm: "$paymentTerm.name",
              discountPercentage: "$paymentTerm.discountPercentage",
            },
          },
        },

        { $sort: { deliveredAt: -1 } },
      ])
      .toArray();

    // =============================
    // CREDIT MEMOS (NON-DSD ONLY)
    // =============================
    const creditMemos = await db
      .collection("creditmemos")
      .aggregate([
        {
          $match: {
            status: "received",
          },
        },

        // JOIN PREORDER (if exists)
        {
          $lookup: {
            from: "preorders",
            localField: "preorder",
            foreignField: "_id",
            as: "preorder",
          },
        },
        {
          $unwind: {
            path: "$preorder",
            preserveNullAndEmptyArrays: true,
          },
        },

        // RESOLVE CLIENT
        {
          $addFields: {
            resolvedClient: {
              $ifNull: ["$client", "$preorder.client"],
            },
          },
        },

        // CLIENT
        {
          $lookup: {
            from: "clients",
            localField: "resolvedClient",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },

        // CHAIN
        {
          $lookup: {
            from: "chains",
            localField: "client.chain",
            foreignField: "_id",
            as: "chain",
          },
        },
        { $unwind: "$chain" },

        // ONLY NON-DSD
        {
          $match: {
            $expr: {
              $ne: [{ $toLower: "$chain.name" }, "dsd"],
            },
          },
        },

        // OPTIONAL FILTERS
        ...(chainId && chainId !== "all"
          ? [
              {
                $match: {
                  "client.chain": new mongoose.Types.ObjectId(chainId),
                },
              },
            ]
          : []),

        ...(vendorId && vendorId !== "all"
          ? [
              {
                $match: {
                  vendor: new mongoose.Types.ObjectId(vendorId),
                },
              },
            ]
          : []),

        // PAYMENT TERM
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
              discountPercentage: "$paymentTerm.discountPercentage",
            },
          },
        },

        { $sort: { returnedAt: -1 } },
      ])
      .toArray();

    return NextResponse.json({
      items: preorders,
      unlinkedCreditMemos: creditMemos,
    });

  } catch (err: any) {
    console.error("Accounting API Error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}