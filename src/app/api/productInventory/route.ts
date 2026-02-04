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
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    let matchStage: any = {};

    // ✅ If searching, find brand ids first
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
        { "brand._id": { $in: brandIds } },
        ...(isObjectId
          ? [{ "product._id": new mongoose.Types.ObjectId(search) }]
          : []),
      ];
    }

    const pipeline: any[] = [

      // ✅ Join product
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },

      { $unwind: "$product" },

      // ✅ Join brand through product
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
          "product.brand": "$brand"
        }
      },

      // ✅ Apply search AFTER lookups
      Object.keys(matchStage).length ? { $match: matchStage } : null,

      // ⭐ SORT BY BRAND NAME THEN PRODUCT NAME
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
          totalCount: [
            { $count: "count" },
          ],
        },
      },

    ].filter(Boolean); // remove null stages

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