import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import User from "@/models/User";
import { RouteAssignmentError, syncRouteClients } from "@/lib/syncRouteClients";
import mongoose from "mongoose";

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
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await context.params;
    const body = await req.json();

    const {
      code,
      type,
      user,
      tempUsers,
      active,
      clients,
    } = body;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid route ID" },
        { status: 400 }
      );
    }

    if (!code || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["vendor", "driver", "onRoute"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid route type" },
        { status: 400 }
      );
    }

    if (user) {
      if (!mongoose.isValidObjectId(user)) {
        return NextResponse.json(
          { error: "Invalid assigned user ID" },
          { status: 400 }
        );
      }

      const userExists = await User.exists({ _id: user });

      if (!userExists) {
        return NextResponse.json(
          { error: "Assigned user does not exist" },
          { status: 400 }
        );
      }
    }

    if (
      clients !== undefined &&
      (!Array.isArray(clients) ||
        clients.some(
          (clientId: unknown) =>
            typeof clientId !== "string" ||
            !mongoose.isValidObjectId(clientId)
        ))
    ) {
      return NextResponse.json(
        { error: "Invalid clients array" },
        { status: 400 }
      );
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {

        const route = await Route.findById(id).session(session);

        if (!route) {
          throw new RouteAssignmentError("Route not found");
        }

        // Preserve the current selection when clients
        // is omitted, but clear it for non-vendor routes.
        const clientIds =
          type === "vendor"
            ? (
                clients ??
                route.clients.map((clientId: any) =>
                  clientId.toString()
                )
              )
            : [];

        // Update route information.
        route.code = code;
        route.type = type;
        route.user = user || null;
        route.tempUsers = tempUsers || [];

        if (active !== undefined) {
          route.active = active;
        }

        await route.save({ session });

        // Synchronize route and clients.
        await syncRouteClients({
          routeId: route._id,
          clientIds,
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    const updatedRoute = await Route.findById(id)
      .populate("user")
      .populate("tempUsers")
      .populate("clients");

    return NextResponse.json(updatedRoute);

  } catch (err: any) {
    console.error("PATCH ROUTE ERROR:", err);

    if (err instanceof RouteAssignmentError) {
      return NextResponse.json(
        { error: err.message },
        {
          status:
            err.message === "Route not found" ? 404 : 400,
        }
      );
    }

    if (err.code === 11000) {
      return NextResponse.json(
        { error: "Route code already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update route" },
      { status: 500 }
    );
  }
}