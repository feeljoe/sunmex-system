import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest){
    try{
        await connectToDatabase();
        const user = getUserFromRequest(req);

        if(!user){
            return NextResponse.json({error: "Unauthorized"}, {status: 401});
        }
        const route = await Route.findOne({ user: user.userId })
        .populate({
            path: "inventory.product",
            populate: { path: "brand" },
        });
        if(!route){
            return NextResponse.json({ inventory: []});
        }

        const inventory = route.inventory.map((item: any) => ({
            productId: item.product._id,
            name: item.product.name,
            brand: item.product.brand?.name,
            unitPrice: item.product.unitPrice,
            available: item.quantity,
            sku: item.product.sku,
            upc: item.product.upc,
            weight: item.product.weight ?? "",
            uom: item.product.unit ?? "",
        }));
        return NextResponse.json({inventory});
    }catch(error) {
        console.error(error);
        return NextResponse.json({error: "Failed to fetch route inventory"}, {status: 500});
    }
}