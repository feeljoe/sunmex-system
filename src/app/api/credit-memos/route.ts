import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import CounterCreditMemo from "@/models/CounterCreditMemo";
import CreditMemo from "@/models/CreditMemo";
import Route from "@/models/Route";
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
  
      const page = Math.max(Number(searchParams.get("page")) || 1, 1);
      const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
      const search = searchParams.get("search")?.trim() || "";
  
      const query: any = {};
  
      if (search) {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
  
        query.$or = [
          { number: { $regex: search, $options: "i" } },
          { "client.clientName": { $regex: search, $options: "i" } },
          ...(isObjectId ? [{ _id: search }] : []),
        ];
      }
  
      const [items, total] = await Promise.all([
        CreditMemo.find(query)
          .populate("client", "clientName")
          .populate("createdBy", "firstName lastName")
          .populate({
            path: "routeAssigned",
            populate: { path: "user"},
          })
          .populate("products.product")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
        CreditMemo.countDocuments(query),
      ]);
  
      return NextResponse.json({
        items,
        total,
        page,
        limit,
      });
    } catch (err: any) {
      return NextResponse.json(
        { error: String(err.message) },
        { status: 500 }
      );
    }
  }