import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import Route from "@/models/Route";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);

  if (!session || !["admin"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const {
    routeId,
    loadRequestIds = [],
  } = await req.json();

  if (!routeId || !loadRequestIds.length) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  const route = await Route.findById(routeId);

  if (!route) {
    return NextResponse.json(
      { error: "Route not found" },
      { status: 404 }
    );
  }

  const loadRequests = await LoadRequest.find({
    _id: { $in: loadRequestIds },
  });

  let assigned = 0;

  for (const lr of loadRequests) {
    // ONLY allow after admin approval + warehouse preparation
    if (!["prepared", "approved"].includes(lr.status)) {
      continue;
    }

    lr.routeAssigned = route._id;
    
    if (lr.status === "approved"){
        lr.status = "assigned";
    }

    lr.assignedAt = new Date();

    await lr.save();
    assigned++;
  }

  return NextResponse.json({
    success: true,
    assigned,
  });
}