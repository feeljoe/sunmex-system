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
    const clientId = searchParams.get("client");
    const vendorId = searchParams.get("vendor");
    const search = searchParams.get("search");

    const match: any = {
      status: "delivered",
      total: { $gte: 0.01 },
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

    if(search){
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      match.$or = [
        {number: {$regex: search, $options: "i"}},
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(search) }] : []),
      ];
    }

    if (vendorId && vendorId !== "all") {
      match.createdBy = new mongoose.Types.ObjectId(vendorId);
    }

    const preorders = await db.collection("preorders").aggregate([
      { $match: match },

      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "client" }},
      { $unwind: "$client" },

      ...(clientId && clientId !== "all"
        ? [{ $match: { "client._id": new mongoose.Types.ObjectId(clientId) }}]
        : []),

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

      {
        $addFields: {
          isDSD: {
            $eq: ["$paymentTerm.dueDays", 0],
          },
          creditTotal: {
            $cond: [
              { $eq: ["$paymentTerm.dueDays", 0] },
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
          vendorId: "$createdBy",
          total: 1,
          credits: "$creditTotal",
          paid: "$paidTotal",
          balance: 1,
          computedStatus: 1,
          payments: 1,
          isDSD: 1,
          source: { $literal: "preorder"},
          client: {
            _id: "$client._id",
            name: "$client.clientName",
            chain: "$client.chain",
            paymentTerm: "$paymentTerm.name",
            dueDays: "$paymentTerm.dueDays",
            discountPercentage: "$paymentTerm.discountPercentage",
          },
          products: 1,
            productInventories: 1,
            productsData: 1,
        },
      },

      { $sort: { deliveredAt: -1 } },
    ]).toArray();

    const directSales = await db.collection("directsales").aggregate([
      { $match: match },

      { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "client" }},
      { $unwind: "$client" },

      ...(clientId && clientId !== "all"
        ? [{ $match: { "client._id": new mongoose.Types.ObjectId(clientId) }}]
        : []),

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
          let: { dsId: "$_id" },
          pipeline: [
            {
              $match: {
                status: "received",
                $expr: { $eq: ["$directSale", "$$dsId"] },
              },
            },
          ],
          as: "credits",
        },
      },

      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productsData",
        },
      },

      {
        $addFields: {
          isDSD: { $eq: ["$paymentTerm.dueDays", 0] },
          creditTotal: {
            $cond: [
              { $eq: ["$paymentTerm.dueDays", 0] },
              { $sum: "$credits.total" },
              0,
            ],
          },
          paidTotal: {
            $sum: {
              $map: { input: "$payments", as: "p", in: "$$p.amount" },
            },
          },
        },
      },
      { $addFields: { net: { $subtract: ["$total", "$creditTotal"] } } },
      { $addFields: { balance: { $max: [ { $round: [ { $subtract: ["$net", "$paidTotal"] }, 2 ] }, 0 ] } } },
      {
        $addFields: {
          computedStatus: {
            $cond: [
              { $eq: ["$balance", 0] }, "paid",
              {
                $cond: [
                  { $eq: ["$paymentTerm.dueDays", 0] }, "unpaid",
                  {
                    $cond: [
                      { $lt: [ { $add: [ "$deliveredAt", { $multiply: [ "$paymentTerm.dueDays", 86400000 ] } ] }, new Date() ] },
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

      ...(statusFilter && statusFilter !== "all" ? [{ $match: { computedStatus: statusFilter } }] : []),

      {
        $project: {
          number: 1,
          deliveredAt: 1,
          vendorId: "$createdBy",
          total: 1,
          credits: "$creditTotal",
          paid: "$paidTotal",
          balance: 1,
          computedStatus: 1,
          payments: 1,
          isDSD: 1,
          source: { $literal: "directSale" }, // <-- Added to help frontend routing
          client: {
            _id: "$client._id",
            name: "$client.clientName",
            chain: "$client.chain",
            paymentTerm: "$paymentTerm.name",
            dueDays: "$paymentTerm.dueDays",
            discountPercentage: "$paymentTerm.discountPercentage",
          },
        },
      },
    ]).toArray();

    const creditMatch: any = { status: "received", total: { $gte: 0.01 } };

    if (from || to) {
      creditMatch.returnedAt = {};
      if (from) creditMatch.returnedAt.$gte = new Date(from + "T00:00:00");
      if (to) creditMatch.returnedAt.$lte = new Date(to + "T23:59:59.999");
    }

    if (search) {
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      creditMatch.$or = [
        { number: { $regex: search, $options: "i" } },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(search) }] : []),
      ];
    }

    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "pending") {
        creditMatch.paymentProcessed = { $ne: true };
      } else if (statusFilter === "paid") {
        creditMatch.paymentProcessed = true;
      } else {
        creditMatch._id = null;
      }
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

      ...(clientId && clientId !== "all"
        ? [{ $match: { "client._id": new mongoose.Types.ObjectId(clientId) }}]
        : []),

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
        $match: {
          $expr: { $ne: ["$paymentTerm.dueDays", 0] },
        },
      },

      {
        $project: {
          number: 1,
          returnedAt: 1,
          vendorId: "$vendor",
          total: 1,
          paymentProcessed: 1,
          client: {
            clientName: "$client.clientName",
            chain: "$client.chain",
            paymentTerm: "$paymentTerm.name",
            dueDays: "$paymentTerm.dueDays",
          },
        },
      },
    ]).toArray();


    const allOrders = [...preorders, ...directSales].sort(
      (a, b) => new Date(b.deliveredAt).getTime() - new Date(a.deliveredAt).getTime()
    );

    return NextResponse.json({
      items: allOrders,
      unlinkedCreditMemos: creditMemos,
    });

  } catch (err: any) {
    console.error("FATAL API ERROR:", err.stack || err); 
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}