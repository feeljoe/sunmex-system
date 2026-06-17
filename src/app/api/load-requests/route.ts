import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { DateTime } from "luxon";

// Extract user from JWT (Mobile) OR Session (Web)
async function getUser(req: Request) {
  // 1. Try to read the Bearer token sent by the React Native app
  const authHeader = req.headers.get("authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      // Decode the JWT. (Make sure this secret matches the one used in your login route)
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET as string
      ) as any;

      if (decoded && ["admin", "driver", "vendor", "warehouse"].includes(decoded.role)) {
        // Map _id to id if your JWT uses MongoDB's _id
        return {
           ...decoded,
           id: decoded.id || decoded._id 
        };
      }
    } catch (error) {
      console.log("Mobile JWT Verification Failed:", error);
      // We don't throw here yet so it can fall back to checking web cookies
    }
  }

  // 2. Fallback: If no valid header, try NextAuth cookies (for web dashboard)
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user || !["admin", "driver", "vendor", "warehouse"].includes(user.role)) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const user = await getUser(req);

    const { searchParams } = new URL(req.url);

    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);

    const search = searchParams.get("search")?.trim() || "";
    const route = searchParams.get("route");
    const status = searchParams.get("status");

    const matchQuery: any = {};

    //
    // ROLE FILTERING
    //
    if (user?.role === "vendor") {
      matchQuery.requestedBy = new mongoose.Types.ObjectId(
        user?.userId
      );
    }

    //
    // STATUS FILTER
    //
    if (status) {
      matchQuery.status = status;
    }

    //
    // ROUTE FILTER
    //
    if(route) {
      matchQuery.routeAssigned = new mongoose.Types.ObjectId(route);
    }

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if(startDate && endDate){
      const start = DateTime.fromISO(startDate, {zone: "America/Phoenix"})
      .startOf("day")
      .toUTC()
      .toJSDate();

      const end = DateTime.fromISO(endDate, {zone: "America/Phoenix"})
      .endOf("day")
      .toUTC()
      .toJSDate();

      matchQuery.createdAt = {
        $gte: start,
        $lte: end,
      };
    } else if(user?.role === "vendor"){
      const phoenixNow = DateTime.now().setZone("America/Phoenix");

      const startOfMonth = phoenixNow
        .startOf("month")
        .toUTC()
        .toJSDate();

      const endOfMonth = phoenixNow
        .endOf("month")
        .toUTC()
        .toJSDate();

      matchQuery.createdAt = {
        $gte: startOfMonth,
        $lte: endOfMonth,
      };
    }

    //
    // SEARCH
    //
    if (search) {
      matchQuery.$or = [
        {
          number: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    //
    // COUNT
    //
    const total = await LoadRequest.countDocuments(matchQuery);

    //
    // GET ITEMS
    //
    const items = await LoadRequest.find(matchQuery)
      .populate({
        path: "requestedBy",
        select: "firstName lastName username",
      })
      .populate({
        path: "reviewedBy",
        select: "firstName lastName",
      })
      .populate({
        path: "assembledBy",
        select: "firstName lastName",
      })
      .populate({
        path: "route",
        populate: {
          path: "user",
          select: "firstName lastName",
        },
      })
      .populate({
        path: "routeAssigned",
        populate: {
          path: "user",
          select: "firstName lastName",
        },
      })
      .populate({
        path: "products.product",
        populate: {
          path: "brand",
        },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      items,
      total,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("LOAD REQUESTS GET ERROR:", err);

    return NextResponse.json(
      {
        error: err.message || "Server Error",
      },
      { status: 500 }
    );
  }
}