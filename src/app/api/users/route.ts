import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
    if(search){
          query.$or = [
            {firstName: {$regex: search, $options: "i"}},
            {lastName: {$regex: search, $options: "i"}},
            {userRole: {$regex: search, $options: "i"}},
            {username: {$regex: search, $options: "i"}},
          ];
        }
    const [items, total] = await Promise.all([
      User.find(query)
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      User.countDocuments(query),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      limit
    });
  }catch(err: any){
    return NextResponse.json({ error: String(err.message) }, {status: 500 });
  }
}

export async function POST(req: Request) {
  await connectToDatabase();

  try {
    const body = await req.json();

    const existingUser = await User.findOne({ username: body.username });
    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const newUser = await User.create({
      ...body,
      password: hashedPassword,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Invalid data" },
      { status: 400 }
    );
  }
}
