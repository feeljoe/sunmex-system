import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    {params}: {params: {id: string}}
) {
    await connectToDatabase;
    const { id } = await params;

    const loadRequest = await LoadRequest.findById(id)
    .populate("requestedBy")
    .populate("route")
    .populate({path: "products",
        populate: {path: "product", populate: {path: "brand"}}
    })
    .lean();

    if(!loadRequest){
        await NextResponse.json(
            { error: "Load Request not found" },
            { status: 404 }
        );
    }

    const productIds = loadRequest.products.map(
        (p: any) => p.product._id
    );
    const inventories = await ProductInventory.find({
        product: {$in: productIds },
    }).lean();

    const inventoryMap = new Map();

    inventories.forEach((inv: any) => {
        inventoryMap.set(
            inv.product.toString(),
            inv.currentInventory || 0
        );
    });

    const enrichedProducts = loadRequest.products.map((p: any) => ({
        ...p,
        currentInventory:
            inventoryMap.get(p.product._id.toString()) || 0,
    }));

    loadRequest.products = enrichedProducts;

    return NextResponse.json(loadRequest);
}