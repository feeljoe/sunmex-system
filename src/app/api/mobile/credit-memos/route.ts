import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CounterCreditMemo from "@/models/CounterCreditMemo";
import Route from "@/models/Route";
import mongoose from "mongoose";
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

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const user = await getUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const phoenixNow = DateTime.now().setZone("America/Phoenix");
    const startOfWeek = phoenixNow
      .startOf("week")
      .toUTC()
      .toJSDate();

    const endOfWeek = phoenixNow
      .endOf("week")
      .toUTC()
      .toJSDate();

    // The core logic: Show ALL pending, PLUS anything created today
    const query = {
      createdBy: user.userId,
      $or: [
        {status: "pending"},
        {createdAt: {
          $gte: startOfWeek,
          $lte: endOfWeek
        }
        },
      ]
    };

    const memos = await CreditMemo.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("client", "clientName billingAddress")
      .populate("products.product", "name sku upc brand");

    const total = await CreditMemo.countDocuments(query);

    return NextResponse.json({ items: memos, total });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await getUser(req);
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const { client, products, subtotal, status, returnReason, directSaleId, signature } = body;

    // 1. Get the Route for numbering (Pass session for transaction safety)
    const route = await Route.findOne({ user: user.userId }).session(session);
    if (!route) throw new Error("Route not found");

    // 2. Generate the Smart CRM Number
    const counter = await CounterCreditMemo.findOneAndUpdate(
      { name: "creditmemo" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    );
    const nextNumber = `CRM-${route.code}-${1000 + counter.seq}`;

    let routeAssigned = status !== "pending" ? route._id : null;
    let total = status !== "pending" ? subtotal : 0;

    // 3. Create the Credit Memo inside the transaction array `[{...}]`
    const [creditMemo] = await CreditMemo.create(
      [
        {
          number: nextNumber,
          client: client,
          createdBy: user.userId,
          routeAssigned: routeAssigned,
          subtotal: subtotal,
          total: total,
          status: status, // "pending" or "received"
          
          directSale: directSaleId ? new mongoose.Types.ObjectId(directSaleId) : undefined,
          
          returnSignature: signature || undefined,
          returnedAt: signature ? new Date() : undefined,
          receivedBy: signature ? user.userId : undefined,
          
          products: products.map((p: any) => ({
            product: p.productId,
            quantity: p.quantity,
            actualCost: p.unitPrice || 0,
            returnReason: p.returnReason || returnReason,
          })),
          createdAt: new Date(),
        }
      ], 
      { session }
    );

    // 4. THE OPTIMIZED INVENTORY RESTOCK LOGIC
    if (creditMemo.status === "received" && products.length > 0) {
      let inventoryModified = false;

      for (const p of products) {
        // Ensure we check the specific product reason, falling back to the global reason
        const reason = p.returnReason || returnReason;

        if (reason === "good return") {
          // Look for the item using .toString() for safety
          const existingItem = route.inventory.find(
            (ip: any) => ip.product.toString() === p.productId.toString()
          );

          if (existingItem) {
            // It exists! Add the returned quantity back to the truck
            existingItem.quantity += p.quantity;
          } else {
            // It doesn't exist! Create a new space for it on the truck
            route.inventory.push({
              product: p.productId,
              quantity: p.quantity,
            });
          }
          inventoryModified = true;
        }
      }

      // If we actually changed the inventory, SAVE the route!
      if (inventoryModified) {
        await route.save({ session });
      }
    }

    // 5. Commit everything to the database
    await session.commitTransaction();

    return NextResponse.json({ message: "Credit Memo Created", creditMemo }, { status: 201 });

  } catch (error: any) {
    await session.abortTransaction();
    console.error("POST CreditMemo error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}