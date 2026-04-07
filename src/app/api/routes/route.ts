import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";
    const type = searchParams.get("type");

    const query: any= {};
    if(search){
          query.$or = [
            {code: {$regex: search, $options: "i"}},
            {type: {$regex: search, $options: "i"}},
          ];
        }
    if(type) {
      query.type = type;
    }
    const [items, total] = await Promise.all([
      Route.find(query)
      .populate("user")
      .populate("clients")
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      Route.countDocuments(query),
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
  const body = await req.json();

  if (!body.code || !body.type) {
    return NextResponse.json(
      { error: "Missing route code or type" },
      { status: 400 }
    );
  }

  const route = await Route.create({
    code: body.code,
    type: body.type,
    user: body.user,
    clients: body.type === "vendor" ? body.clients || [] : [],
  });

  return NextResponse.json(route, { status: 201 });
}
