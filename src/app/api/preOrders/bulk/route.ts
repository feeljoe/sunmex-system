import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";

export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided"}, {status: 400});
        }

        const preorders = await PreOrder.find({_id: {$in: ids } })
        .populate("client")
        .populate("createdBy")
        .populate("routeAssigned");

        return NextResponse.json(preorders, {status: 200});
    } catch (error: any) {
        console.error("Bulk fetch error:", error);
        return NextResponse.json({ error: error.message }, {status: 500 });
    }
}