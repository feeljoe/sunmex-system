import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  const { connection } = await connectToDatabase();

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 100);

  const type = searchParams.get("type"); // "preorder" | "creditMemo" | null
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
  const buildMatch = (isPreorder: boolean) => {
    const match: any = {};

    if (status) match.status = status;

    if (vendorId) {
      match.createdBy = new mongoose.Types.ObjectId(vendorId);
    }

    if (warehouseId && isPreorder) {
      match.assembledBy = new mongoose.Types.ObjectId(warehouseId);
    }

    if (fromDate || toDate) {
      const dateField = isPreorder ? "deliveredAt" : "returnedAt";

      match[dateField] = {};

      if (fromDate) {
        const from = parseLocalDate(fromDate);
        from.setHours(0, 0, 0, 0);
        match[dateField].$gte = from;
      }

      if (toDate) {
        const to = parseLocalDate(toDate);
        to.setHours(23, 59, 59, 999);
        match[dateField].$lte = to;
      }
    }

    return match;
  };

  // ---------------- SORT ----------------
  const buildSortStages = () => {
    if (!hasDateFilter) {
      return [{ $sort: { createdAt: -1 } }];
    }

    const fallbackDate = fromDate
      ? new Date(fromDate + "T00:00:00")
      : new Date(0);

    return [
      {
        $addFields: {
          sortDate: {
            $ifNull: ["$completedAt", fallbackDate],
          },
        },
      },
      { $sort: { sortDate: -1 } },
    ];
  };

  // ---------------- PREORDER PIPELINE ----------------
  const preorderPipeline = [
    { $match: buildMatch(true) },

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
          $concat: ["$routeUser.firstName", " ", "$routeUser.lastName"],
        },

        handledCode: "$routeAssigned.code",

        completedAt: "$deliveredAt",

        cancelledAt: 1,
      },
    },
  ];

  // ---------------- CREDIT MEMO PIPELINE ----------------
  const creditMemoPipeline = [
    { $match: buildMatch(false) },

    { $lookup: { from: "clients", localField: "client", foreignField: "_id", as: "client" } },
    { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "createdBy", foreignField: "_id", as: "createdBy" } },
    { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "routes", localField: "routeAssigned", foreignField: "_id", as: "routeAssigned" } },
    { $unwind: { path: "$routeAssigned", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "users", localField: "routeAssigned.user", foreignField: "_id", as: "routeUser" } },
    { $unwind: { path: "$routeUser", preserveNullAndEmptyArrays: true } },

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
          $concat: ["$routeUser.firstName", " ", "$routeUser.lastName"],
        },

        handledCode: "$routeAssigned.code",

        completedAt: "$returnedAt",

        cancelledAt: 1,
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

  if (type === "creditMemo") {
    pipeline = [
      ...creditMemoPipeline,
      ...buildSortStages(),
    ];

    const result = await connection.db
      .collection("creditmemos") // ✅ KEY FIX
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