import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import SupplierReceipt from "@/models/SupplierReceipt";
import SupplierOrder from "@/models/SupplierOrder";
import ProductInventory from "@/models/ProductInventory";
import User from "@/models/User";
import Supplier from "@/models/Supplier";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
    if(search){
      const suppliers = await Supplier.find({
              name: {$regex: search, $options: "i"},
            }).select("_id");
            const supplierIds = suppliers.map(s => s._id);
            const supplierOrders = await SupplierOrder.find({
              poNumber: {$regex: search, $options: "i"},
            }).select("_id");
            const supplierOrderIds = supplierOrders.map(so => so._id);
          query.$or = [
            {invoice: {$regex: search, $options: "i"}},
            {supplier: {$in: supplierIds}},
            {poNumber: {$in: supplierOrderIds}},
          ];
        }
    const [items, total] = await Promise.all([
      SupplierReceipt.find(query)
      .populate("supplier")
      .populate("supplierOrder")
      .populate("elaboratedBy")
      .populate({
        path: "items.product",
        populate: {
          path: "brand",
        },
      })
      .sort({name: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      SupplierReceipt.countDocuments(query),
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
  const session = await mongoose.startSession();

  try {
    await connectToDatabase();
    session.startTransaction();

    const body = await req.json();

    const {
      invoice,
      supplierOrderId,
      elaboratedBy,
      items,
    } = body;

    if (!invoice || !supplierOrderId || !items?.length || !elaboratedBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supplierOrder = await SupplierOrder
      .findById(supplierOrderId)
      .populate("supplier")
      .session(session);

    if (!supplierOrder) {
      throw new Error("Supplier order not found");
    }

    const currentUser = await User
      .findById(elaboratedBy)
      .session(session);

      if(!currentUser) {
        throw new Error("User not found");
      }

    // Calculate total from received items
    const total = items.reduce(
      (sum: number, it: any) =>
        sum + it.receivedQuantity * it.actualCost,
      0
    );

    // 1️⃣ Create receipt
    const receipt = await SupplierReceipt.create(
      [
        {
          invoice,
          poNumber: supplierOrder.poNumber,
          supplierOrder: supplierOrder._id,
          supplier: supplierOrder.supplier._id,
          requestedAt: supplierOrder.requestedAt,
          receivedAt: new Date(),
          elaboratedBy: currentUser,
          items,
          total,
        },
      ],
      { session }
    );

    // 2️⃣ Update inventory
    for (const item of items) {
      await ProductInventory.findOneAndUpdate(
        { product: item.product },
        { $inc: { currentInventory: item.receivedQuantity } },
        { upsert: true, session }
      );
    }

    // 3️⃣ Update supplier order status
    supplierOrder.status = "received";
    await supplierOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(receipt[0], { status: 201 });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();

    console.error("Create supplier receipt error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
