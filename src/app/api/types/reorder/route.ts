import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Type from "@/models/Type";

export async function PATCH(req: Request) {
    try {
        await connectToDatabase();
        const body = await req.json();
        
        const bulkOps = body.map((cat: any) => ({
            updateOne: {
                filter: { _id: cat._id },
                update: { $set: { order: cat.order } }
            }
        }));
        
        await Type.bulkWrite(bulkOps);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}