import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);

        if(!session?.user){
            return NextResponse.json({ error: "Unauthorized"}, {status:401});
        }
        const { searchParams } = new URL(req.url);

        const productsParam = searchParams.get("products");

        const query: any = {};

        if(productsParam){
            const ids = productsParam.split(",").filter(Boolean);

            query.product = {
                $in: ids,
            };
        }
        const items = await ProductInventory.find(query)
            .populate({
                path: "product",
                populate: { path: "brand" },
            })
            .lean();

        return NextResponse.json({ items });
    } catch(err: any) {
        return NextResponse.json({ error: err.message || "Server Error"}, { status: 500 });
    }
}