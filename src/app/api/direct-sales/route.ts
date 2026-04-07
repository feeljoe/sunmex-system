import { connectToDatabase } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DirectSale from "@/models/DirectSale";
import ProductInventory from "@/models/ProductInventory";
import Route from "@/models/Route";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(){
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    if(!session){
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
    const role = session.user.role;
    const userId = session.user.id;

    let query: any = {};

    if(role === "onRoute"){
        const route = await Route.findOne({user: userId});

        if(!route){
            return NextResponse.json([], {status:200});
        }
        query.route = route._id;
    }
    const sales = await DirectSale.find(query)
        .populate("client", "clientName")
        .populate("route", "code")
        .populate("seller", "firstName lastName")
        .populate({
            path: "products.productInventory",
            populate: {
                path: "product",
                populate: { path: "brand"},
            },
        })
        .sort({ deliveredAt: -1});

    return NextResponse.json(sales);
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
        routeId,
        clientId,
        products,
        signature,
      } = await req.json();
  
      const route = await Route.findById(routeId).session(session);
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
  
      const count = await DirectSale.countDocuments().session(session);
  
      const [sale] = await DirectSale.create(
        [
          {
            number: `DS-${3000 + count}`,
            route: routeId,
            seller: sessionUser.user.id,
            client: clientId,
            products,
            total,
            signature,
            deliveredAt: new Date(),
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
  