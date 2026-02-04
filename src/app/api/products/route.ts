import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import ProductInventory from '@/models/ProductInventory';
import Brand from '@/models/Brand';
import mongoose from 'mongoose';

export async function GET(req: Request) {
  try{
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    let matchStage: any= {};

    if(search){
      const brands = await Brand.find({
        name: {$regex: search, $options: "i"},
      }).select("_id");
      const brandIds = brands.map(b => b._id);
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      matchStage.$or = [
        {sku: {$regex: search, $options: "i"}},
        {upc: {$regex: search, $options: "i"}},
        {name: {$regex: search, $options: "i"}},
        {brand: {$in: brandIds}},
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(search) }] : []),
      ];
    }

    const pipeline: any[] = [

      { $match: matchStage },

      // join brand collection
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brand",
        },
      },

      { $unwind: "$brand" },

      // ⭐ SORT BY BRAND NAME FIRST, THEN PRODUCT NAME
      {
        $sort: {
          "brand.name": 1,
          name: 1,
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
    ];

    const result = await Product.aggregate(pipeline);
    const items = result[0]?.items || [];
    const total = result[0]?.totalCount[0]?.count || 0;
    return NextResponse.json({
      items,
      total,
      page,
      limit,
    });
  }catch(err:any){
    return NextResponse.json({ error: String(err.message) }, {status: 500 });
  }
}

export async function POST(req: Request) {
  try{
    await connectToDatabase();

    const body = await req.json();

     // Validate required fields minimally
     if (!body.sku || !body.upc || !body.name || !body.brand) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const product = await Product.create({
      sku: body.sku,
      vendorSku: body.vendorSku || null,
      upc: body.upc,
      brand: body.brand,
      name: body.name,
      productType: body.productType,
      productFamily: body.productFamily,
      productLine: body.productLine,
      unitCost: body.unitCost,
      unitPrice: body.unitPrice,
      caseSize: body.caseSize,
      layerSize: body.layerSize,
      palletSize: body.palletSize,
      weight: body.weight,
      image: body.image || null, // URL returned by Cloudinary
    });

    await ProductInventory.create({
      product: product._id,
      currentInventory: 0,
      preSavedInventory: 0,
      onRouteInventory: 0,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err: any) {
    console.error("Product create error:", err);
    return NextResponse.json({ error: String(err.message) }, { status: 500 });
  }
}
