import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import Brand from "@/models/Brand";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 200);

    const search = searchParams.get("search")?.trim() || "";
    const brand = searchParams.get("brand");
    const availableOnly = searchParams.get("availableOnly") === "true";

    let matchStage: any = {};

    // ✅ Brand filter
    if (brand && mongoose.Types.ObjectId.isValid(brand)) {
      matchStage["product.brand._id"] = new mongoose.Types.ObjectId(brand);
    }

    // ✅ Available only filter
    if (availableOnly) {
      matchStage.currentInventory = { $gt: 0 };
    }

    // ✅ Search filter
    if (search) {
      const brands = await Brand.find({
        name: { $regex: search, $options: "i" },
      }).select("_id");

      const brandIds = brands.map(b => b._id);

      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);

      matchStage.$or = [
        { "product.name": { $regex: search, $options: "i" } },
        { "product.sku": { $regex: search, $options: "i" } },
        { "product.upc": { $regex: search, $options: "i" } },
        { "product.brand": { $in: brandIds } },
        ...(isObjectId
          ? [{ "product._id": new mongoose.Types.ObjectId(search) }]
          : []),
      ];
    }

    const pipeline: any[] = [
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      {
        $lookup: {
          from: "brands",
          localField: "product.brand",
          foreignField: "_id",
          as: "brand",
        },
      },
      { $unwind: "$brand" },

      {
        $addFields: {
          "product.brand": "$brand",
        },
      },

      Object.keys(matchStage).length ? { $match: matchStage } : null,

      // ✅ Always sort by product name (brand grouping handled in frontend)
      {
        $sort: {
          "brand.name": 1,
          "product.name": 1,
        },
      },

      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ].filter(Boolean);

    const result = await ProductInventory.aggregate(pipeline);

    const items = result[0]?.items || [];
    const total = result[0]?.totalCount[0]?.count || 0;

    return NextResponse.json({
      items,
      total,
      page,
      limit,
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: String(err.message) },
      { status: 500 }
    );
  }
}