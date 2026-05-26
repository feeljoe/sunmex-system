import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Route from "@/models/Route";
import { NextResponse } from "next/server";

export async function GET(){
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if(!session || session.user.role !== "vendor") {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const route = await Route.findOne({user: session.user.id})
    .populate("user")
    .populate("clients")
    .populate({path: "inventory", populate: {path: "product", populate: { path: "brand"}}})
    .sort({code: 1})
    if(!route) return NextResponse.json([]);

    return NextResponse.json(route);
}