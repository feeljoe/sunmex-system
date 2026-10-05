import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Brand from "@/models/Brand";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const limit = Math.min(
      Number(searchParams.get("limit")) || 50,
      100
    );

    const productQuery: any = {};

    if (search) {
        const matchinBrands = await Brand.find({
            name: {
                $regex: search,
                $options: "i",
            },
        }).select("_id").lean();
    
        const brandIds = matchinBrands.map(
            (brand) => brand._id
        );

      productQuery.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          sku: {
            $regex: search,
            $options: "i",
          },
        },
        {
          upc: {
            $regex: search,
            $options: "i",
          },
        },
      ];

      if(brandIds.length > 0) {
        productQuery.$or.push({
            brand: {
                $in: brandIds,
            },
        });
      }
    }

    const matchingProducts =
      await Product.find(productQuery)
        .select("_id")
        .limit(limit)
        .lean();

    const productIds =
      matchingProducts.map((p) => p._id);

    const items =
      await ProductInventory.find({
        product: {
          $in: productIds,
        },
      })
        .populate({
          path: "product",
          populate: {
            path: "brand",
          },
        })
        .limit(limit)
        .lean();

    return NextResponse.json({
      items,
    });

  } catch (err: any) {
    console.error("PRODUCT INVENTORY SEARCH ERROR: ", err);
    return NextResponse.json(
      {
        error:
          err.message || "Server error",
      },
      { status: 500 }
    );
  }
}