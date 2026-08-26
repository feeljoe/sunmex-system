import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DirectSale from "@/models/DirectSale";
import { DateTime } from "luxon";

export async function PATCH(req: Request) {
    try {
        await connectToDatabase();
        const { ids, newDate } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
        }
        if (!newDate) {
            return NextResponse.json({ error: "No date provided" }, { status: 400 });
        }

        // Set the new date to NOON in Phoenix time. 
        const parsedDate = DateTime.fromISO(newDate, { zone: "America/Phoenix" })
            .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
            .toJSDate();

        // THE FIX: We must pass { timestamps: false } to bypass Mongoose's immutable protection on 'createdAt'
        const result = await DirectSale.updateMany(
            { _id: { $in: ids } },
            { 
                $set: { 
                    createdAt: parsedDate,
                    updatedAt: new Date() // Manually touch the update time so we know it was altered
                } 
            },
            { 
                timestamps: false,
                overwriteImmutable: true
            } // <--- This overrides the lock!
        );

        return NextResponse.json({ success: true, modifiedCount: result.modifiedCount });
    } catch (error: any) {
        console.error("Bulk reassign error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}