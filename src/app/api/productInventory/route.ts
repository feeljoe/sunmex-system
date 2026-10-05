import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import ForeignInventory from "@/models/ForeignInventory";
import PreOrder from "@/models/PreOrder";
import User from "@/models/User";
import Brand from "@/models/Brand";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeInventoryLocation } from "@/utils/inventoryResolver";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    await connectToDatabase();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 200);

    const search = searchParams.get("search")?.trim() || "";
    const brand = searchParams.get("brand");
    const type = searchParams.get("type");
    const availableOnly = searchParams.get("availableOnly") === "true";
    const preorderId = searchParams.get("preorderId");

    const user = await User.findById(session.user.id).select("location").lean();
    if (!user) {
      return NextResponse.json({ error: "User Not Found" }, { status: 404 });
    }

    let inventoryLocation = normalizeInventoryLocation(user?.location);
    if (preorderId) {
      if (!mongoose.Types.ObjectId.isValid(preorderId)) {
        return NextResponse.json({ error: "Invalid Preorder ID" }, { status: 400 });
      }

      const preorder = await PreOrder.findById(preorderId).select("inventoryLocation").lean();

      if (!preorder) {
        return NextResponse.json({ error: "Preorder Not Found" }, {status: 404});
      }
      inventoryLocation = normalizeInventoryLocation(preorder.inventoryLocation);
    }
    const useForeignInventory = inventoryLocation !== "phoenix";
    const InventoryModel = useForeignInventory
      ? ForeignInventory
      : ProductInventory;

    let matchStage: any = {};

    // Brand filter
    if (brand && mongoose.Types.ObjectId.isValid(brand)) {
      matchStage["product.brand._id"] = new mongoose.Types.ObjectId(brand);
    }

    // Type filter
    if (type && mongoose.Types.ObjectId.isValid(type)) {
      matchStage["product.productType._id"] = new mongoose.Types.ObjectId(type);
    }

    // Available only filter
    if (availableOnly) {
      matchStage.currentInventory = { $gt: 0 };
    }

    // Search filter
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

    const locationStage = useForeignInventory
      ? {
        $match: {
          location: inventoryLocation,
        },
      }
      : null;

    const pipeline: any[] = [
      locationStage,
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
        $lookup: {
          from: "types",
          localField: "product.productType",
          foreignField: "_id",
          as: "productType",
        },
      },

      {
        $unwind: {
          path: "$productType",
          preserveNullAndEmptyArrays: true
        }
      },

      {
        $addFields: {
          "product.brand": "$brand",
          "product.productType": "$productType",
        },
      },

      Object.keys(matchStage).length ? { $match: matchStage } : null,

      // Always sort by product name (brand grouping handled in frontend)
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
          stats: [
            {
              $group: {
                _id: null,
                totalMoney: {
                  $sum: {
                    $multiply: [
                      {
                        $add: [
                          { $ifNull: ["$currentInventory", 0] },
                          { $ifNull: ["$preSavedInventory", 0] },
                        ]
                      },
                      { $ifNull: ["$product.unitCost", 0] },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ].filter(Boolean);

    const result = await InventoryModel.aggregate(pipeline);

    const items = result[0]?.items || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    const totalInventoryMoney = result[0]?.stats[0]?.totalMoney || 0; //Extract the inventory in money

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      totalInventoryMoney,
      inventoryLocation,
      InventoryModel: useForeignInventory
        ? "ForeignInventory"
        : "ProductInventory",
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: String(err.message) },
      { status: 500 }
    );
  }
}