import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import CounterCreditMemo from "@/models/CounterCreditMemo";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
  try {
    await connectToDatabase();
    const body = await req.json();
    const counter = await CounterCreditMemo.findOneAndUpdate(
          {name: "creditmemo" },
          { $inc: { seq: 1 } },
          { new: true, upsert: true}
        );
        let nextNumber;
        // 1️⃣ Validate client access
        if (session?.user?.role === "vendor") {
          const route = await Route.findOne({
            type: "vendor",
            user: session.user.id,
            clients: body.client,
          });
    
          if (!route) {
            throw new Error("Client not assigned to this vendor");
          }
          nextNumber =  `CRM-${route.code}-${1000 + counter.seq}`;
        }else {
          nextNumber = `CRM-001-${1000 + counter.seq}`;
        }

    const creditMemo = await CreditMemo.create({
      number: nextNumber,
      client: body.client,
      createdBy: session?.user?.id,
      subtotal: body.total,
      status: body.status ?? "pending",
      createdAt: new Date(),
      products: body.products.map((p: any) => {
        if(!p.product) throw new Error("product ID is missing");
        return {
        product: p.product,
        quantity: p.quantity,
        actualCost: p.actualCost ?? 0,
        returnReason: p.returnReason,
        }
      }),
    });

    return NextResponse.json(creditMemo, { status: 201 });
  } catch (error: any) {
    console.error("POST CreditMemo error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

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
    
    const session = await getServerSession(authOptions);

    const matchQuery: any= {};
    const baseFilters: any= {};
    if(fromDate && toDate){
      
      const [fy, fm, fd] = fromDate.split("-").map(Number);
      const [ty, tm, td] = toDate.split("-").map(Number);
      const start = new Date(fy, fm-1, fd, 0, 0, 0, 0);
      const end = new Date(ty, tm-1, td, 23, 59, 59, 999);
      
      baseFilters.createdAt = {
        $gte: start,
        $lte: end,
      };
    }
    if(session?.user?.role === "vendor"){
          const vendorIdObj = new mongoose.Types.ObjectId(session.user.id);
          matchQuery.$or = [
            {
              createdBy: vendorIdObj,
              status: "pending",
            },
            {
              createdBy: vendorIdObj,
              ...baseFilters,
            }
          ];
        }else {
          Object.assign(matchQuery, baseFilters);
          if (vendorId) {
            matchQuery.createdBy = new mongoose.Types.ObjectId(vendorId);
          }
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

      // JOIN PRODUCTS
      {
        $lookup: {
          from: "products",
          localField: "products.product",
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
          }
        } else {
          const clean = token.replace(/"/g,"");

          generalSearch.push(
            { number:{ $regex:clean, $options:"i"} },
            { "client.clientName":{ $regex:clean, $options:"i"} },
            { "productDocs.name":{ $regex:clean, $options:"i"} },
            { status:{ $regex:clean, $options:"i"} }
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

    let items = await CreditMemo.aggregate(pipeline);

    items = await CreditMemo.populate(items, [
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
          path: "products.product",
          populate: { path: "brand" },
      },
      { path: "cancelledBy" },
    ]);
    const totalResult = await CreditMemo.aggregate([
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