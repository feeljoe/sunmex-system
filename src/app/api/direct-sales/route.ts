import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DirectSale from "@/models/DirectSale";
import CounterDirectSale from "@/models/CounterDirectSales";
import Route from "@/models/Route";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

// /api/direct-sales/route.ts
export async function GET(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const session = await getServerSession(authOptions);

  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const creatorId = searchParams.get("creatorId"); // matching 'createdBy'
  const search = searchParams.get("search")?.trim() || "";

  const query: any = {};

  // VENDOR: Only see their own sales for TODAY
  if (session.user.role === "vendor") {
    const phoenixNow = DateTime.now()
      .setZone("America/Phoenix");
    const start = phoenixNow
      .startOf("day")
      .toUTC()
      .toJSDate();
    const end = phoenixNow
    .endOf("day")
    .toUTC()
    .toJSDate();

    query.createdAt = { $gte: start, $lte: end };
    query.createdBy = new mongoose.Types.ObjectId(session.user.id);
  } else {
    // ADMIN: Date range and specific creator filters
    if (fromDate && toDate) {
      const startOfDate = DateTime.fromISO(fromDate, { zone: "America/Phoenix" })
        .startOf("day")
        .toUTC().
        toJSDate();
      
      const endOfDate = DateTime.fromISO(toDate, { zone: "America/Phoenix" })
        .endOf("day")
        .toUTC()
        .toJSDate();
      
        query.createdAt = {
        $gte: startOfDate,
        $lte: endOfDate,
      };
    }
    if (creatorId) {
      query.createdBy = new mongoose.Types.ObjectId(creatorId);
    }
  }

  // Simple search implementation
  if (search) {
    query.$or = [
      { number: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } }
    ];
  }

  const items = await DirectSale.find(query)
    .populate({
      path: "client",
      populate: {
        path: "paymentTerm"
      },
    })
    .populate("route")
    .populate("createdBy", "firstName lastName")
    .populate("updatedBy", "firstName lastName")
    .populate({
      path: "products",
      populate: {
        path: "product",
        populate: {
          path: "brand",
        },
      },
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await DirectSale.countDocuments(query);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: Request) {
    await connectToDatabase();
  
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const sessionUser = await getServerSession(authOptions);
      if (!sessionUser) {
        throw new Error("Unauthorized");
      }
  
      const {
        clientId,
        products,
        signature,
      } = await req.json();
  
      const route = await Route.findOne({user: sessionUser.user.id}).session(session);
      if (!route) throw new Error("Route not found");
  
      if (
        sessionUser.user.role !== "admin" &&
        route.user.toString() !== sessionUser.user.id
      ) {
        throw new Error("Route does not belong to this user");
      }
  
      let total = 0;
  
      for (const item of products) {
        const routeItem = route.inventory.find(
          (i: any) => i.product.toString() === item.product
        );
  
        if (!routeItem || routeItem.quantity < item.quantity) {
          throw new Error("Insufficient route inventory");
        }
  
        routeItem.quantity -= item.quantity;
        total += item.quantity * item.unitPrice;
      }
  
      await route.save({ session });
      
          // 2. Generate the Smart DS Number
          const counter = await CounterDirectSale.findOneAndUpdate(
            { name: "directSale" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session } // Pass session here too!
          );
          const nextNumber = `DS-${route.code}-${1000 + counter.seq}`;
  
      const [sale] = await DirectSale.create(
        [
          {
            number: nextNumber,
            route: route._id,
            createdBy: sessionUser.user.id,
            client: clientId,
            products,
            total,
            signature,
            deliveredAt: new Date(),
            updatedAt: new Date(),
            updatedBy: sessionUser.user.id,
          },
        ],
        { session }
      );
  
      await session.commitTransaction();
      return NextResponse.json(sale);
    } catch (err: any) {
      await session.abortTransaction();
      return NextResponse.json({ error: err.message }, { status: 400 });
    } finally {
      session.endSession();
    }
  }
  