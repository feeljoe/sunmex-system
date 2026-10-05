import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { connectToDatabase } from "@/lib/db";
import ForeignInventory from "@/models/ForeignInventory";

export async function GET() {
    try {
        await connectToDatabase();

        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        if (!["admin", "warehouse"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const inventory = await ForeignInventory.find({})
            .populate({
                path: "product",
                populate: {
                    path: "brand",
                },
            })
            .lean();

        const locations = [
            {
                code: "yuma",
                name: "Yuma",
            },
            {
                code: "tucson",
                name: "Tucson",
            },
            {
                code: "elPaso",
                name: "El Paso",
            },
            {
                code: "lasVegas",
                name: "Las Vegas",
            },
        ];

        const items = locations.map((location) => {
            const products = inventory.filter((item: any) => item.location === location.code);

            const totalQuantity = products.reduce((sum: number, item: any) => sum + Number(item.currentInventory || 0), 0);

            const totalValue = products.reduce((sum: number, item: any) => {
                const quantity = Number(item.currentInventory || 0);
                const unitCost = Number(item.product?.unitCost || 0);

                return (sum + quantity * unitCost);
            },
                0
            );

            return {
                _id: location.code,
                location: location.code,
                locationName: location.name,
                totalProducts: products.length,
                totalQuantity,
                totalValue,
                products,
            };
        }
        );
        return NextResponse.json({
            items,
        });
    } catch (err: any) {
        console.error("FOREIGN INVENTORY SUMMARY ERROR: ", err);
        return NextResponse.json({error: err.message || "Failed to load foreign inventory"}, {status:500});
    }
}