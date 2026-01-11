import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import User from "@/models/User";
import Client from "@/models/Client";

/* ---------------- PUT ---------------- */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }>}
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const body = await req.json();
    const { code, type, user, clients } = body;

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

    // user → always stored as array in your schema
    route.users = user ? [user] : [];

    // only vendor routes have clients
    route.clients = type === "vendor" ? clients : [];

    await route.save();

    const updatedRoute = await Route.findById(route._id)
      .populate("user")
      .populate("clients");

    return NextResponse.json(updatedRoute);
  } catch (err) {
    console.error("PUT route error:", err);
    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }
}

/* ---------------- DELETE (optional) ---------------- */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }>}
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const route = await Route.findByIdAndDelete(id);
    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE route error:", err);
    return NextResponse.json(
      { error: "Failed to delete route" },
      { status: 500 }
    );
  }
}
