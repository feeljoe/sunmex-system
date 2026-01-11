import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Route from "@/models/Route";
import ProductInventory from "@/models/ProductInventory";
import { NextResponse } from "next/server";

export async function GET(){
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if(!session || session.user.role !== "onRoute") {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const route = await Route.findOne({user: session.user.id});
    if(!route) return NextResponse.json([]);

    const inventory = await ProductInventory.find({
        route: route._id,
        onRouteInventory: {$gt: 0},
    }).populate({
        path: "product",
        populate: {path: "brand"},
    });

    return NextResponse.json(inventory);
}