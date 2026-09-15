import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import User from "@/models/User";
import Client from "@/models/Client";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const route = await Route.findById(id)
      .populate({
        path: "inventory.product",
        populate: {
          path: "brand",
        },
      })
      .populate("user")
      .populate("tempUsers");

    if (!route) {
      return NextResponse.json(
        { error: "Route Not Found" },
        { status: 404 }
      );
    }

    return NextResponse.json(route);
  } catch (err) {
    console.error("Error fetching route:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* ---------------- PATCH ---------------- */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }>}
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const body = await req.json();
    const { code, type, user, tempUsers, active, clients } = body;

    const route = await Route.findById(id);
    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    /* -------- VALIDATION -------- */

    if (!code || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (user) {
      const userExists = await User.findById(user);
      if (!userExists) {
        return NextResponse.json(
          { error: "Assigned user does not exist" },
          { status: 400 }
        );
      }
    }

    if (type === "vendor" && clients?.length) {
      const validClients = await Client.countDocuments({
        _id: { $in: clients },
      });

      if (validClients !== clients.length) {
        return NextResponse.json(
          { error: "One or more clients are invalid" },
          { status: 400 }
        );
      }
    }

    /* -------- UPDATE -------- */

    route.code = code;
    route.type = type;
    route.user = user || null;

    route.tempUsers = tempUsers || [];
    if (active !== undefined) route.active = active;

    route.clients = type === "vendor" ? clients : [];

    await route.save();

    const updatedRoute = await Route.findById(route._id)
      .populate("user")
      .populate("tempUsers")
      .populate("clients");

    return NextResponse.json(updatedRoute);
  } catch (err) {
    console.error("PATCH route error:", err);
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }
}
