import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import CounterPreorder from "@/models/CounterPreorder";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const routeId = searchParams.get("routeAssigned");
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";
    // ✅ get the new filters from searchParams
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const vendorId = searchParams.get("vendorId");
    const warehouseUserId = searchParams.get("warehouseUserId");
    const session = await getServerSession(authOptions);

    const query: any= {};
    if(fromDate && toDate){
      const [fy, fm, fd] = fromDate.split("-").map(Number);
      const [ty, tm, td] = toDate.split("-").map(Number);
      const start = new Date(fy, fm-1, fd, 0, 0, 0, 0);
      const end = new Date(ty, tm-1, td, 23, 59, 59, 999);
      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }
    if(session?.user?.role === "vendor"){
      query.createdBy = session.user.id;
    }else if (vendorId) {
      query.createdBy = vendorId;
    }
    if (warehouseUserId) {
      query.assembledBy = warehouseUserId;
    }    
    
    if(routeId) query.routeAssigned = routeId;
    if(search){
          query.$or = [
            {number: {$regex: search, $options: "i"}},
          ];
        }
    const [items, total] = await Promise.all([
      PreOrder.find(query)
      .populate({
        path: "client",
        populate: {
          path: "billingAddress",
        },
      })
      .populate({
        path: "routeAssigned",
        populate: {
          path: "user",
        },
      })
      .populate("createdBy", "firstName lastName")
      .populate("assembledBy", "firstName lastName")
      .populate({
        path: "products.productInventory",
        populate: {
          path: "product",
          populate: {
            path: "brand",
          },
        },
      })
      .populate("cancelledBy")
      .sort({createdAt: -1})
      .skip((page - 1) * limit)
      .limit(limit),
      PreOrder.countDocuments(query),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      limit
    });
  }catch(err: any){
    return NextResponse.json({ error: String(err.message) }, {status: 500 });
  }
}


export async function POST(req: Request) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();
    const user = await getServerSession(authOptions);
    if(!user?.user.id || !user.user.role){
        throw new Error("User not authenticated");
    }

    const counter = await CounterPreorder.findOneAndUpdate(
      {name: "preorder" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true}
    );
    let nextNumber;
    // 1️⃣ Validate client access
    if (user?.user.role === "vendor") {
      const route = await Route.findOne({
        type: "vendor",
        user: user.user.id,
        clients: body.client,
      });

      if (!route) {
        throw new Error("Client not assigned to this vendor");
      }
      nextNumber =  `INV-${route.code}-${1000 + counter.seq}`;
    }else {
      nextNumber = `INV-001-${1000 + counter.seq}`;
    }
    let total = 0;

      const productsToSave = body.products.map((p: any) => ({
        productInventory: p.inventoryId,
        quantity: p.quantity,
        actualCost: p.effectiveUnitPrice ?? p.unitPrice ?? 0,
      }));
       // 2️⃣ Inventory validation + update
    for (const item of productsToSave) {
        const inventory = await ProductInventory.findById(item.productInventory).session(session);
  

      if (!inventory || inventory.currentInventory < item.quantity) {
        throw new Error(`Insufficient inventory for product ${inventory?.product.name}`);
      }

      inventory.currentInventory -= item.quantity;
      inventory.preSavedInventory += item.quantity;
      await inventory.save({ session });

      total += item.quantity * item.actualCost;
    }

    // 3️⃣ Save preorder
    const preorder = await PreOrder.create(
      [
        {
          number: nextNumber,
          client: body.client,
          products: productsToSave,
          subtotal: total,
          createdBy: new mongoose.Types.ObjectId(user?.user.id),
          status: "pending",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return Response.json(preorder[0], { status: 201 });

  } catch (err: any) {
    await session.abortTransaction();
    console.log("Error:", err);
    return Response.json({ error: err.message }, { status: 400 });
  } finally {
    session.endSession();
  }
}
