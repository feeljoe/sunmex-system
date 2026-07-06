import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { connection } = await connectToDatabase();

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 100);

  const type = searchParams.get("type"); // "preorder" | "creditMemo" | directSale | null
  const status = searchParams.get("status");
  const vendorId = searchParams.get("vendorId");
  const driverId = searchParams.get("driverId");
  const warehouseId = searchParams.get("warehouseId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  const skip = (page - 1) * limit;
  const hasDateFilter = !!fromDate || !!toDate;

  const parseLocalDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00");

  // ---------------- MATCH BUILDER ----------------
  const buildMatch = (isPreorder: boolean, isDirectSale: boolean) => {
    const match: any = {};

    if (status) match.status = status;

    if (vendorId) {
      match.createdBy = new mongoose.Types.ObjectId(vendorId);
    }

    if (warehouseId && isPreorder) {
      match.assembledBy = new mongoose.Types.ObjectId(warehouseId);
    }

    if (fromDate || toDate) {
      const dateCondition: any = {};
      
      if (fromDate) {
        const from = parseLocalDate(fromDate);
        from.setHours(0, 0, 0, 0);
        dateCondition.$gte = from;
      }

      if (toDate) {
        const to = parseLocalDate(toDate);
        to.setHours(23, 59, 59, 999);
        dateCondition.$lte = to;
      }

      const completedField = (isPreorder || isDirectSale) ? "deliveredAt" : "returnedAt";

      // Apply the date filter to the correct field based on the status!
      if (status === "cancelled") {
        match.cancelledAt = dateCondition;
      } else if (status === "pending" || status === "assigned" || status === "ready") {
        match.createdAt = dateCondition;
      } else if (status === "delivered" || status === "received") {
        match[completedField] = dateCondition;
      } else {
        // If no specific status is selected, show documents that were either
        // created, completed, or cancelled within this date range.
        match.$or = [
          { [completedField]: dateCondition },
          { cancelledAt: dateCondition },
          { createdAt: dateCondition }
        ];
      }
    }

    return match;
  };

  // ---------------- SORT ----------------
  const buildSortStages = () => {
    if (!hasDateFilter) {
      return [{ $sort: { createdAt: -1 } }];
    }

    return [
      {
        $addFields: {
          sortDate: {
            $ifNull: ["$completedAt", { $ifNull: ["$cancelledAt", "$createdAt"] }],
          },
        },
      },
      { $sort: { sortDate: -1 } },
    ];
  };

  // ---------------- PREORDER PIPELINE ----------------
  const preorderPipeline = [
    { $match: buildMatch(true, false) },

    { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "client" } },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "createdBy" } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "assembledBy", foreignField: "_id", as: "assembledBy" } },
    { $unwind: { path: "$assembledBy", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "routes", localField: "routeAssigned", foreignField: "_id", as: "routeAssigned" } },
    { $unwind: { path: "$routeAssigned", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "routeAssigned.user", foreignField: "_id", as: "routeUser" } },
    { $unwind: { path: "$routeUser", preserveNullAndEmptyArrays: true } },
    
    { $lookup: { from: "users", localField: "deliveredBy", foreignField: "_id", as: "deliveredBy"}},
    { $unwind: { path: "$deliveredBy", preserveNullAndEmptyArrays: true } },

    {$lookup: { from: "users", localField: "cancelledBy", foreignField: "_id", as: "cancelledBy" } },
    { $unwind: { path: "$cancelledBy", preserveNullAndEmptyArrays: true } },

    ...(driverId
      ? [{
          $match: {
            "routeUser._id": new mongoose.Types.ObjectId(driverId),
          },
        }]
      : []),

    {
      $project: {
        _id: 1,
        type: { $literal: "preorder" },
        number: 1,
        clientName: "$client.clientName",
        subtotal: 1,
        total: 1,
        status: 1,
        createdAt: 1,

        createdBy: {
          $concat: ["$createdBy.firstName", " ", "$createdBy.lastName"],
        },

        assembledBy: {
          $cond: [
            "$assembledBy",
            { $concat: ["$assembledBy.firstName", " ", "$assembledBy.lastName"] },
            "-",
          ],
        },

        assembledAt: 1,

        handledBy: {
          $concat: ["$deliveredBy.firstName", " ", "$deliveredBy.lastName"],
        },

        handledCode: "$routeAssigned.code",

        completedAt: "$deliveredAt",

        cancelledAt: 1,
        cancelledBy: {
          $cond: [
            "$cancelledBy",
            { $concat: ["$cancelledBy.firstName", " ", "$cancelledBy.lastName"] },
            "-",
          ],
        },
      },
    },
  ];

  // ---------------- DIRECT SALE PIPELINE ----------------
  const directSalePipeline = [
    { $match: buildMatch(false, true) },

    { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "client" } },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "createdBy" } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "routes", localField: "route", foreignField: "_id", as: "routeData" } },
    { $unwind: { path: "$routeData", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "routeData.user", foreignField: "_id", as: "routeUser" } },
    { $unwind: { path: "$routeUser", preserveNullAndEmptyArrays: true } },
    
    { $lookup: { from: "users", localField: "deliveredBy", foreignField: "_id", as: "deliveredBy" } },
    { $unwind: { path: "$deliveredBy", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "cancelledBy", foreignField: "_id", as: "cancelledBy" } },
    { $unwind: { path: "$cancelledBy", preserveNullAndEmptyArrays: true } },

    ...(driverId
      ? [{
          $match: {
            "routeUser._id": new mongoose.Types.ObjectId(driverId),
          },
        }]
      : []),

    {
      $project: {
        _id: 1,
        type: { $literal: "directSale" },
        number: 1,
        clientName: "$client.clientName",
        subtotal: 1,
        total: 1,
        status: 1,
        createdAt: 1,

        createdBy: {
          $concat: ["$createdBy.firstName", " ", "$createdBy.lastName"],
        },
        handledBy: {
          $cond: [
            "$deliveredBy",
            { $concat: ["$deliveredBy.firstName", " ", "$deliveredBy.lastName"] },
            "-",
          ],
        },
        handledCode: "$routeData.code",

        completedAt: "$deliveredAt",

        cancelledAt: 1,

        cancelledBy: {
          $cond: [
            "$cancelledBy",
            { $concat: ["$cancelledBy.firstName", " ", "$cancelledBy.lastName"] },
            "-",
          ],
        },
      },
    },
  ];

  // ---------------- CREDIT MEMO PIPELINE ----------------
  const creditMemoPipeline = [
    { $match: buildMatch(false, false) },

    { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "client" } },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "createdBy" } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "routes", localField: "routeAssigned", foreignField: "_id", as: "routeAssigned" } },
    { $unwind: { path: "$routeAssigned", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "routeAssigned.user", foreignField: "_id", as: "routeUser" } },
    { $unwind: { path: "$routeUser", preserveNullAndEmptyArrays: true } },
    
    { $lookup: { from: "users", localField: "returnedBy", foreignField: "_id", as: "returnedBy" } },
    { $unwind: { path: "$returnedBy", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "cancelledBy", foreignField: "_id", as: "cancelledBy" } },
    { $unwind: { path: "$cancelledBy", preserveNullAndEmptyArrays: true } },

    ...(driverId
      ? [{
          $match: {
            "routeUser._id": new mongoose.Types.ObjectId(driverId),
          },
        }]
      : []),

    {
      $project: {
        _id: 1,
        type: { $literal: "creditMemo" },
        number: 1,
        clientName: "$client.clientName",
        subtotal: 1,
        total: 1,
        status: 1,
        createdAt: 1,

        createdBy: {
          $concat: ["$createdBy.firstName", " ", "$createdBy.lastName"],
        },

        assembledBy: { $literal: "-" },
        assembledAt: { $literal: null },

        handledBy: {
          $concat: ["$returnedBy.firstName", " ", "$returnedBy.lastName"],
        },

        handledCode: "$routeAssigned.code",

        completedAt: "$returnedAt",

        cancelledAt: 1,

        cancelledBy: {
          $cond: [
            "$cancelledBy",
            { $concat: ["$cancelledBy.firstName", " ", "$cancelledBy.lastName"] },
            "-",
          ],
        },
      },
    },
  ];

  // ---------------- BUILD PIPELINE ----------------
  let pipeline: any[] = [];

  if (type === "preorder") {
    pipeline = [
      ...preorderPipeline,
      ...buildSortStages(),
    ];
    const result = await connection.db
      .collection("preorders")
      .aggregate([
        ...pipeline,
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      items: result[0].data,
      total: result[0].total[0]?.count || 0,
    });
  }

  if (type === "directSale") {
    pipeline = [
      ...directSalePipeline,
      ...buildSortStages(),
    ];
    const result = await connection.db
      .collection("directsales")
      .aggregate([
        ...pipeline,
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      items: result[0].data,
      total: result[0].total[0]?.count || 0,
    });
  }

  if (type === "creditMemo") {
    pipeline = [
      ...creditMemoPipeline,
      ...buildSortStages(),
    ];

    const result = await connection.db
      .collection("creditmemos")
      .aggregate([
        ...pipeline,
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    return NextResponse.json({
      items: result[0].data,
      total: result[0].total[0]?.count || 0,
    });
  }

  // ---------------- BOTH (DEFAULT) ----------------
  pipeline = [
    ...preorderPipeline,
    {
      $unionWith: {
        coll: "creditmemos",
        pipeline: creditMemoPipeline,
      },
    },
    {
      $unionWith: {
        coll: "directsales",
        pipeline: directSalePipeline,
      },
    },
    ...buildSortStages(),
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
  ];

  const result = await connection.db
    .collection("preorders")
    .aggregate(pipeline)
    .toArray();

  return NextResponse.json({
    items: result[0].data,
    total: result[0].total[0]?.count || 0,
  });
}