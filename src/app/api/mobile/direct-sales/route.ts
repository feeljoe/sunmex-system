import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import DirectSale from "@/models/DirectSale";
import CounterDirectSale from "@/models/CounterDirectSales";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CreditMemo from "@/models/CreditMemo";
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

      if (decoded && ["admin", "driver", "vendor"].includes(decoded.role)) {
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
  
  if (!user || !["admin", "driver", "vendor"].includes(user.role)) {
    throw new Error("Unauthorized");
  }

  return user;
}

// GET: Fetch Direct Sales for the mobile table
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const clientId = url.searchParams.get("clientId");
    const dateFilter = url.searchParams.get("date");

    let query: any = { createdBy: user.userId || user.id};
    if(clientId){
      query.client = clientId;
    }
    if(dateFilter === "today"){
      const phoenixNow = DateTime.now().setZone("America/Phoenix");
      const startOfDay = phoenixNow
        .startOf("day")
        .toUTC()
        .toJSDate();

      const endOfDay = phoenixNow
        .endOf("day")
        .toUTC()
        .toJSDate();
      
      query.createdAt = {$gte: startOfDay, $lte: endOfDay};
    }

    // 1. Fetch the Sales
    const sales = await DirectSale.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("client", "clientName")
      .populate("products.product", "name sku upc unit weight brand");

    const total = await DirectSale.countDocuments({ createdBy: user.id });

    // 2. Fetch the associated Credit Memos for these Sales
    const saleIds = sales.map(s => s._id);
    const creditMemos = await CreditMemo.find({
      directSale: { $in: saleIds }
    }).populate("products.product").lean();

    // 3. Map them together
    const creditMemoMap = new Map();
    creditMemos.forEach(cm => {
      creditMemoMap.set(cm.directSale.toString(), cm);
    });

    // 4. Attach the Credit Memo to the Sale object
    const formattedSales = sales.map(sale => {
      const cm = creditMemoMap.get(sale._id.toString());
      return {
        ...sale.toObject(),
        creditMemo: cm || null
      };
    });

    return NextResponse.json({ items: formattedSales, total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new Direct Sale with Transactions and Counter
export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await getUser(req);
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const {
      clientId,
      products,
      paymentStatus, // 'pending' or 'paid'
      payments,      // Array of cash/check objects
      signature,
      status,
    } = body;

    if (!clientId || !products?.length || !signature) {
      throw new Error("Missing required fields");
    }

    // 1. Find the Route (tied to this session!)
    const route = await Route.findOne({ user: user.userId }).session(session);
    if (!route) throw new Error("Route not found for this user");

    // 2. Generate the Smart DS Number
    const counter = await CounterDirectSale.findOneAndUpdate(
      { name: "directSale" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session } // Pass session here too!
    );
    const nextNumber = `DS-${route.code}-${1000 + counter.seq}`;

    // 3. Pre-validate and Calculate
    let total = 0;
    const failedItems: any[] = [];

    for (const p of products) {
      const item = route.inventory.find(
        (i: any) => i.product.toString() === p.productId
      );

      if (!item || item.quantity < p.quantity) {
        failedItems.push({
          productId: p.productId,
          requested: p.quantity,
          available: item ? item.quantity : 0
        });
        continue;
      }

      // Deduct inventory inside memory
      item.quantity -= p.quantity;
      total += p.quantity * p.unitPrice;
    }

    if (failedItems.length > 0) {
      throw { type: "INVENTORY_ERROR", details: failedItems };
    }

    // 4. Save the deducted inventory to the DB
    await route.save({ session });

    const targetStatus = status || (signature ? "delivered" : "pending");

    // 5. Create the Direct Sale Document
    const [sale] = await DirectSale.create(
      [
        {
          number: nextNumber,
          route: route._id,
          createdBy: user.userId,
          client: clientId,
          status: targetStatus, // based on your schema
          products: products.map((p: any) => ({
            product: p.productId,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
          total,
          paymentStatus: paymentStatus || "pending",
          payments: payments || [],
          signature: signature || null,
          deliveredAt: targetStatus === "delivered" ? new Date(): null,
        },
      ],
      { session }
    );

    // 6. If everything succeeds, commit to the database!
    await session.commitTransaction();
    return NextResponse.json({ sale });

  } catch (error: any) {
    // If anything fails, rollback the inventory deductions!
    await session.abortTransaction();
    console.error("POST Direct Sale Error:", error);

    if (error.type === "INVENTORY_ERROR") {
      return NextResponse.json(
        { error: "Insufficient truck stock", details: error.details },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to create direct sale" },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  } finally {
    session.endSession();
  }
}