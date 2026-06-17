import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import Route from "@/models/Route";

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    
    const memo = await CreditMemo.findById(id)
      .populate("client")
      .populate({path: "routeAssigned", populate: {path: "user"}})
      .populate({ path: "products.product", populate: { path: "brand" } });

    if (!memo) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(memo);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await connectToDatabase();
    
    // 1. Start the transaction session
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const user = await getUser(req); // Ensure user is authenticated
      if (!user) {
        throw new Error("Unauthorized");
      }
  
      const { id } = await params;
      const body = await req.json();
      const { directSaleId, routeAssignedId, total } = body;
  
      if (!directSaleId || !routeAssignedId) {
        throw new Error("Missing required fields");
      }
  
      // 2. Fetch the Credit Memo inside the transaction
      const memo = await CreditMemo.findById(id).session(session);
      if (!memo) {
        throw new Error("Credit memo not found");
      }
  
      // 3. Update the Credit Memo details
      memo.status = "received";
      memo.directSale = directSaleId;
      memo.pickedQuantity = memo.quantity ?? 0;
      memo.returnedQuantity = memo.quantity ?? 0;
      memo.routeAssigned = routeAssignedId;
      memo.returnedAt = new Date();
      memo.total = total;
  
      // 4. Fetch the Route to manage inventory
      const route = await Route.findById(routeAssignedId).session(session);
      if (!route) {
        throw new Error("Route not found");
      }
  
      // 5. RESTOCK LOGIC: Check for "good return" products
      let inventoryModified = false;
  
      if (memo.products && memo.products.length > 0) {
        for (const p of memo.products) {
          if (p.returnReason?.toLowerCase() === "good return") {
            // Look for the item using .toString() for safety
            const existingItem = route.inventory.find(
              (ip: any) => ip.product.toString() === p.product.toString()
            );
  
            if (existingItem) {
              // It exists! Add the returned quantity back to the truck
              existingItem.quantity += p.quantity;
            } else {
              // It doesn't exist! Create a new space for it on the truck
              route.inventory.push({
                product: p.product,
                quantity: p.quantity,
              });
            }
            inventoryModified = true;
          }
        }
      }
  
      // 6. Save the modifications securely
      await memo.save({ session });
      
      if (inventoryModified) {
        await route.save({ session });
      }
  
      // 7. Commit the transaction
      await session.commitTransaction();
  
      return NextResponse.json(memo);
    } catch (err: any) {
      // If anything goes wrong, rollback all changes
      await session.abortTransaction();
      console.error("PATCH CreditMemo error:", err);
      
      // Return appropriate status codes based on the error
      const status = err.message === "Unauthorized" ? 401 
                   : err.message === "Credit memo not found" ? 404 
                   : err.message === "Missing required fields" ? 400 
                   : 500;
                   
      return NextResponse.json({ error: err.message }, { status });
    } finally {
      // Always end the session to prevent memory leaks
      session.endSession();
    }
  }