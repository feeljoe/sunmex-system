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
    
    const routeId = searchParams.get("routeId");
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";
    // ✅ get the new filters from searchParams
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const vendorId = searchParams.get("vendorId");
    const warehouseUserId = searchParams.get("warehouseUserId");
    
    const session = await getServerSession(authOptions);

    const matchQuery: any= {};
    
    if(fromDate && toDate){
      
      const [fy, fm, fd] = fromDate.split("-").map(Number);
      const [ty, tm, td] = toDate.split("-").map(Number);
      const start = new Date(fy, fm-1, fd, 0, 0, 0, 0);
      const end = new Date(ty, tm-1, td, 23, 59, 59, 999);
      
      matchQuery.createdAt = {
        $gte: start,
        $lte: end,
      };
    }
    if(session?.user?.role === "vendor"){
      matchQuery.createdBy = new mongoose.Types.ObjectId(session.user.id);
    }else if (vendorId) {
      matchQuery.createdBy = new mongoose.Types.ObjectId(vendorId);
    }
    if (warehouseUserId) {
      matchQuery.assembledBy = new mongoose.Types.ObjectId(warehouseUserId);
    }    
    
    if(routeId) matchQuery.routeAssigned = new mongoose.Types.ObjectId(routeId);
    
    const pipeline: any[] = [
      {$match: matchQuery},
      // JOIN CLIENT
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: "$client" },

      // JOIN PRODUCT INVENTORY
      {
        $lookup: {
          from: "productinventories",
          localField: "products.productInventory",
          foreignField: "_id",
          as: "productInventoryDocs",
        },
      },

      // JOIN PRODUCTS
      {
        $lookup: {
          from: "products",
          localField: "productInventoryDocs.product",
          foreignField: "_id",
          as: "productDocs",
        },
      },
    ];
    
    if(search){
      const tokens = search.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

      const andConditions: any[] = [];
      const generalSearch: any[] = [];
      tokens.forEach(token => {
        const [rawKey, ...rest] = token.split(":");
        if(rest.length){
          const key = rawKey.toLowerCase();
          const value = rest.join(":").replace(/"/g,"");

          switch(key){
            case "status":
              andConditions.push({ status:value });
              break;

            case "payment":
              andConditions.push({ paymentStatus:value });
              break;

            case "client":
              andConditions.push({ "client.clientName": { $regex:value, $options:"i" } });
              break;

            case "product":
              andConditions.push({ "productDocs.name": { $regex:value, $options:"i" } });
              break;

            case "number":
              andConditions.push({ number: { $regex:value, $options:"i" } });
              break;

            case "total":
              if(!isNaN(Number(value)))
                andConditions.push({ total:Number(value) });
              break;

            case "subtotal":
              if(!isNaN(Number(value)))
                andConditions.push({ subtotal:Number(value) });
              break;

            case "type":
              andConditions.push({ type:value });
              break;
          }
        } else {
          const clean = token.replace(/"/g,"");

          generalSearch.push(
            { number:{ $regex:clean, $options:"i"} },
            { "client.clientName":{ $regex:clean, $options:"i"} },
            { "productDocs.name":{ $regex:clean, $options:"i"} },
            { status:{ $regex:clean, $options:"i"} },
            { paymentStatus:{ $regex:clean, $options:"i"} },
            { paymentMethod:{ $regex:clean, $options:"i"} }
          );
        }
      });

      const finalMatch: any = {};
      if(andConditions.length) finalMatch.$and = andConditions;
      if(generalSearch.length) finalMatch.$or = generalSearch;
      pipeline.push({ $match: finalMatch});
    }

    pipeline.push({
      $addFields: {
        sortNumber: {
          $toInt: {
            $arrayElemAt: [{ $split: ["$number", "-"] }, -1],
          },
        },
      },
    });
    pipeline.push({ $sort: { sortNumber: -1 } });
    const countPipeline = [...pipeline];
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    let items = await PreOrder.aggregate(pipeline);

    items = await PreOrder.populate(items, [
      {
        path: "client",
        populate: { path: "billingAddress" },
      },
      {
        path: "routeAssigned",
        populate: { path: "user" },
      },
      { path: "createdBy", select: "firstName lastName" },
      { path: "assembledBy", select: "firstName lastName" },
      {
        path: "products.productInventory",
        populate: {
          path: "product",
          populate: { path: "brand" },
        },
      },
      { path: "cancelledBy" },
    ]);
    const totalResult = await PreOrder.aggregate([
      ...countPipeline,
      { $count: "total"}
    ]);

    const total = totalResult[0]?.total || 0;

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
          type: body.type,
          noChargeReason: body.noChargeReason || "",
          subtotal: body.type === "noCharge" ? 0: total,
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
