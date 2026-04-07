import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const {username, password} = await req.json();
    await connectToDatabase();

    const admin = await User.findOne({username, userRole:"admin"});
    if(!admin) return NextResponse.json({}, {status: 401});

    const valid = await bcrypt.compare(password, admin.password);
    if(!valid) return NextResponse.json({}, {status: 401});

    return NextResponse.json({adminId: admin._id});
}