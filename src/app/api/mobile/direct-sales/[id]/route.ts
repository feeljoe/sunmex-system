import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DirectSale from "@/models/DirectSale";
import Route from "@/models/Route";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CreditMemo from "@/models/CreditMemo";

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

// GET: Fetch Single Sale
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const sale = await DirectSale.findById(id)
      .populate({ path: "client", populate: {path: "chain"}})
      .populate({path: "route", populate: {path: "user"}})
      .populate({ path: "products.product", populate: { path: "brand" } })
      .lean();

    if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
    
    const attachedMemo = await CreditMemo.findOne({ directSale: id })
      .populate({ path: "products.product", populate: { path: "brand" } })
      .lean();

    const payload = {
      ...sale,
      creditMemo: attachedMemo || null
    };
    return NextResponse.json(payload);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: The Complex Edit Delta & Payment Update
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const user = await getUser(req);
      if (!user) throw new Error("Unauthorized");
  
      const { id } = await params;
      
      // Extract everything that might be passed in
      const { products, signature, payments, paymentStatus, status } = await req.json();
  
      const existingSale = await DirectSale.findById(id).session(session);
      if (!existingSale) throw new Error("Sale not found");
  
      // --- SCENARIO 1: INVENTORY & PRODUCT EDIT ---
      // Only run this heavy math if the mobile app actually sent an updated products array!
      if (products && Array.isArray(products)) {
        const route = await Route.findById(existingSale.route).session(session);
        if (!route) throw new Error("Route not found");
  
        // 1. REVERT: Add the old items back to the truck's inventory
        for (const oldItem of existingSale.products) {
          const routeItem = route.inventory.find((i: any) => i.product.toString() === oldItem.product.toString());
          if (routeItem) routeItem.quantity += oldItem.quantity;
        }
  
        // 2. DEDUCT: Apply the new items and check limits
        let newTotal = 0;
        const failedItems: any[] = [];
  
        for (const newItem of products) {
          const routeItem = route.inventory.find((i: any) => i.product.toString() === newItem.productId.toString());
  
          if (!routeItem || routeItem.quantity < newItem.quantity) {
            failedItems.push({ productId: newItem.productId, requested: newItem.quantity });
            continue;
          }
  
          routeItem.quantity -= newItem.quantity;
          newTotal += newItem.quantity * newItem.unitPrice;
        }
  
        if (failedItems.length > 0) throw { type: "INVENTORY_ERROR", details: failedItems };
  
        // Save the route inventory changes
        await route.save({ session });
  
        // Update the sale products and total
        existingSale.products = products.map((p: any) => ({
          product: p.productId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
        }));
        existingSale.total = newTotal;
      }
  
      // --- SCENARIO 2: SIMPLE UPDATES (Payments & Signatures) ---
      if (signature) existingSale.signature = signature;
      if (payments) existingSale.payments = payments;
      if (paymentStatus) existingSale.paymentStatus = paymentStatus;

      if(status) {
        existingSale.status = status;
        if (status === "delivered" && !existingSale.deliveredAt){
          existingSale.deliveredAt = new Date();
        }
      }
  
      // Save the Direct Sale document
      await existingSale.save({ session });
  
      await session.commitTransaction();
      return NextResponse.json({ message: "Updated successfully", sale: existingSale });
    } catch (err: any) {
      await session.abortTransaction();
      if (err.type === "INVENTORY_ERROR") return NextResponse.json({ error: "Insufficient truck stock", details: err.details }, { status: 400 });
      return NextResponse.json({ error: err.message }, { status: 500 });
    } finally {
      session.endSession();
    }
  }