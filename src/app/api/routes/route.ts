import { connectToDatabase } from "@/lib/db";
import { RouteAssignmentError, syncRouteClients } from "@/lib/syncRouteClients";
import Route from "@/models/Route";
import mongoose from "mongoose";
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
      .populate("tempUsers")
      .populate("clients")
      .populate({path: "inventory", populate: {path: "product", populate: { path: "brand"}}})
      .sort({code: 1})
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
    console.error(" FATAL API ERROR:", err.stack || err); 
    
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();

    const {
      code,
      type,
      user,
      tempUsers,
      clients,
    } = body;

    if (!code || !type) {
      return NextResponse.json(
        { error: "Missing route code or type" },
        { status: 400 }
      );
    }

    if (!["vendor", "driver", "onRoute"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid route type" },
        { status: 400 }
      );
    }

    const clientIds = type === "vendor"
      ? clients ?? []
      : [];

    if (
      !Array.isArray(clientIds) ||
      clientIds.some(
        (id: unknown) =>
          typeof id !== "string" ||
          !mongoose.isValidObjectId(id)
      )
    ) {
      return NextResponse.json(
        { error: "Invalid clients array" },
        { status: 400 }
      );
    }

    let createdRouteId: string | null = null;

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {

        const [route] = await Route.create(
          [
            {
              code,
              type,
              user: user || null,
              tempUsers: tempUsers || [],
              clients: [],
            },
          ],
          { session }
        );

        createdRouteId = route._id.toString();

        await syncRouteClients({
          routeId: route._id,
          clientIds,
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    const createdRoute = await Route.findById(createdRouteId)
      .populate("user")
      .populate("tempUsers")
      .populate("clients");

    return NextResponse.json(createdRoute, {
      status: 201,
    });

  } catch (err: any) {
    console.error("CREATE ROUTE ERROR:", err);

    if (err instanceof RouteAssignmentError) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }

    if (err.code === 11000) {
      return NextResponse.json(
        { error: "Route code already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create route" },
      { status: 500 }
    );
  }
}