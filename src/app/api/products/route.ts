import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Product from '@/models/Product';
import ProductInventory from '@/models/ProductInventory';
import Brand from '@/models/Brand';

export async function GET(req: Request) {
  try{
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
    if(search){
      const brands = await Brand.find({
        name: {$regex: search, $options: "i"},
      }).select("_id");
      const brandIds = brands.map(b => b._id);
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
      query.$or = [
        {sku: {$regex: search, $options: "i"}},
        {upc: {$regex: search, $options: "i"}},
        {name: {$regex: search, $options: "i"}},
        { brand: {$in: brandIds}},
        ...(isObjectId ? [{ _id: search }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      Product.find(query)
      .populate("brand")
      .sort({ name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      Product.countDocuments(query),
    ]);
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
