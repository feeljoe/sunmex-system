// /app/api/productInventory/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import Product from "@/models/Product";
import Brand from "@/models/Brand";


export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
      const products = await Product.find({
        $or: [
          { name: {$regex: search, $options: "i"} },
          { sku: {$regex: search, $options: "i"} },
        ],
      }).select("_id");
      const productIds = products.map(p => p._id);
      const brands = await Brand.find({
        name: {$regex: search, $options: "i"},
      }).select("_id");
      const brandIds = brands.map(p => p._id);

          query.$or = [
            {brand: {$in: brandIds}},
            {product: {$in: productIds}},
            
          ];
          const matchStage = {
            $match: {
              $or: [
                { brand: { $in: brandIds } },
                { product: { $in: productIds } },
              ],
            },
          };          
        const pipeline: any[] = [
          matchStage,
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
              as: "product.brand",
            },
          },
          { $unwind: "$product.brand" },
          {
            $addFields: {
              matchPriority: {
                $cond: [
                  { $in: ["$product.brand._id", brandIds] },
                  0, // brand match first
                  1, // product match second
                ],
              },
            },
          },
          { $sort: { matchPriority: 1, "product.name": 1 } },
        
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ];
        const totalPipeline = [
          matchStage,
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
            $group: {
              _id: null,
              totalMoney: {
                $sum: {
                  $multiply: ["$product.unitCost", "$currentInventory"],
                },
              },
            },
          },
        ];
        
    const [items, totalArr, moneyArr] = await Promise.all([
      ProductInventory.aggregate(pipeline),
      ProductInventory.aggregate([
        { $match: query },
        { $count: "count"},
      ]),
      ProductInventory.aggregate(totalPipeline),
    ]);
    const total = totalArr[0]?.count || 0;
    const totalInventoryMoney = moneyArr[0]?.totalMoney || 0;
    return NextResponse.json({
      items,
      total,
      totalInventoryMoney,
      page,
      limit
    });
  }catch(err: any){
    return NextResponse.json({ error: String(err.message) }, {status: 500 });
  }
}
