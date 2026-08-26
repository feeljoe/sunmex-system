import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import CounterPreorder from "@/models/CounterPreorder";
import Client from "@/models/Client";
import { DateTime } from "luxon";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const routeId = searchParams.get("routeId");
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 2000, 3000);
    const search = searchParams.get("search")?.trim() || "";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const vendorId = searchParams.get("vendorId");
    const warehouseUserId = searchParams.get("warehouseUserId");

    const session = await getServerSession(authOptions);

    // We use a strict $and array to cleanly stack all conditions
    const matchQuery: any = { $and: [] };
    let parsedStatus = "";

    // 1. DYNAMIC SEARCH PARSING (From the Search Bar)
    if (search) {
      const tokens = search.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const searchAndConditions: any[] = [];
      const generalSearch: any[] = [];

      for (const token of tokens) {
        const [rawKey, ...rest] = token.split(":");
        if (rest.length) {
          const key = rawKey.toLowerCase();
          const value = rest.join(":").replace(/"/g, "");

          switch (key) {
            case "status":
              parsedStatus = value.toLowerCase();
              searchAndConditions.push({ status: parsedStatus });
              break;
            case "payment":
              searchAndConditions.push({ paymentStatus: value });
              break;
            case "number":
              searchAndConditions.push({ number: { $regex: value, $options: "i" } });
              break;
            case "total":
              searchAndConditions.push({ total: Number(value) });
              break;
            case "subtotal":
              searchAndConditions.push({ subtotal: Number(value) });
              break;
          }
        } else {
          const clean = token.replace(/"/g, "");
          const matchingClients = await Client.find({ clientName: { $regex: clean, $options: "i" } }, "_id").lean();
          const clientIds = matchingClients.map((c: any) => c._id);

          generalSearch.push(
            { number: { $regex: clean, $options: "i" } },
            { client: { $in: clientIds } },
            { status: { $regex: clean, $options: "i" } },
            { paymentStatus: { $regex: clean, $options: "i" } }
          );
        }
      }

      if (searchAndConditions.length > 0) {
        matchQuery.$and.push(...searchAndConditions);
      }
      if (generalSearch.length > 0) {
        matchQuery.$and.push({ $or: generalSearch });
      }
    }

    // 2. SAFE TIMEZONE DATE FILTERING 🔥
    if (fromDate && toDate) {
      const start = DateTime.fromISO(fromDate, { zone: "America/Phoenix" }).startOf("day").toJSDate();
      const end = DateTime.fromISO(toDate, { zone: "America/Phoenix" }).endOf("day").toJSDate();

      let dateCondition: any = {};
      
      // If the user explicitly typed a status in the search bar, honor that specific field
      if (parsedStatus === "ready") {
        dateCondition = { assembledAt: { $gte: start, $lte: end } };
      } else if (parsedStatus === "delivered") {
        dateCondition = { deliveredAt: { $gte: start, $lte: end } };
      } else if (parsedStatus === "cancelled") {
        dateCondition = { cancelledAt: { $gte: start, $lte: end } };
      } else if (parsedStatus === "pending" || parsedStatus === "assigned") {
        dateCondition = { createdAt: { $gte: start, $lte: end } };
      } else {
        // THE FIX: If no specific status is requested by the backend search string, 
        // return any order that had ACTIVITY during this date range!
        dateCondition = {
          $or: [
            { createdAt: { $gte: start, $lte: end } },
            { assembledAt: { $gte: start, $lte: end } },
            { deliveredAt: { $gte: start, $lte: end } },
            { cancelledAt: { $gte: start, $lte: end } }
          ]
        };
      }
      
      matchQuery.$and.push(dateCondition);
    }

    // 3. ROLE & SPECIFIC FILTERS
    if (session?.user?.role === "vendor") {
      const vendorIdObj = new mongoose.Types.ObjectId(session.user.id);
      matchQuery.$and.push({ $or: [{ createdBy: vendorIdObj, status: "pending" }] });
    } else {
      if (vendorId) {
        matchQuery.$and.push({ createdBy: new mongoose.Types.ObjectId(vendorId) });
      }
    }
    
    if (warehouseUserId) {
      matchQuery.$and.push({ assembledBy: new mongoose.Types.ObjectId(warehouseUserId) });
    }
    if (routeId) {
      matchQuery.$and.push({ routeAssigned: new mongoose.Types.ObjectId(routeId) });
    }

    // Cleanup the array if it's empty so MongoDB doesn't throw a syntax error
    if (matchQuery.$and.length === 0) {
      delete matchQuery.$and;
    }

    // 4. BLAZING FAST FIND & POPULATE
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      PreOrder.find(matchQuery)
        .sort({ _id: -1 }) 
        .skip(skip)
        .limit(limit)
        .populate({
          path: "client",
          populate: [{ path: "billingAddress" }, { path: "paymentTerm" }],
        })
        .populate({
          path: "routeAssigned",
          populate: { path: "user" },
        })
        .populate("createdBy", "firstName lastName")
        .populate("deliveredBy", "firstName lastName")
        .populate("assembledBy", "firstName lastName")
        .populate("cancelledBy", "firstName lastName")
        .populate({
          path: "products.productInventory",
          populate: {
            path: "product",
            populate: { path: "brand" },
          },
        })
        .lean(),
      PreOrder.countDocuments(matchQuery)
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit
    });
  } catch (err: any) {
    console.error("GET PREORDERS ERROR:", err);
    return NextResponse.json({ error: String(err.message) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = await req.json();
    const user = await getServerSession(authOptions);
    if (!user?.user.id || !user.user.role) {
      throw new Error("User not authenticated");
    }

    // AUTOMATIC INVOICE COUNTER

    const counter = await CounterPreorder.findOneAndUpdate(
      { name: "preorder" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    let nextNumber;
    // Validate client access
    if (user?.user.role === "vendor") {
      const route = await Route.findOne({
        type: "vendor",
        user: user.user.id,
        clients: body.client,
      });

      if (!route) {
        throw new Error("Client not assigned to this vendor");
      }
      nextNumber = `INV-${route.code}-${1000 + counter.seq}`;
    } else {
      nextNumber = `INV-001-${1000 + counter.seq}`;
    }
    // PREP PRODUCTS
    const productsToSave = body.products.map((p: any) => ({
      productInventory: p.productInventory,
      quantity: Math.round(Number(p.quantity)),
      actualCost: p.effectiveUnitPrice ?? p.unitPrice ?? 0,
    }));

    // Inventory prevalidation
    const failedItems: any[] = [];
    let total = 0;
    const inventoryDocs = new Map<string, any>();

    for (const item of productsToSave) {
      const inventory = await ProductInventory
        .findById(item.productInventory)
        .populate("product")
        .session(session);

      inventoryDocs.set(item.productInventory, inventory);

      if (!inventory || inventory.currentInventory < item.quantity) {
        failedItems.push({
          inventoryId: item.productInventory,
          name: inventory?.product?.name || "Unknown product",
          requested: item.quantity,
          available: inventory?.currentInventory || 0.
        });
        continue;
      }
      total += item.quantity * item.actualCost;
    }
    if (failedItems.length > 0) {
      throw {
        type: "INVENTORY_ERROR",
        message: "Some products are no longer available",
        details: failedItems,
      };
    }

    //APPLY INVENTORY CHANGES
    for (const item of productsToSave) {
      const inventory = inventoryDocs.get(item.productInventory);

      inventory.currentInventory -= item.quantity;
      inventory.preSavedInventory += item.quantity;
      await inventory.save({ session });
    }

    // SAVE PREORDER
    const preorder = await PreOrder.create(
      [
        {
          number: nextNumber,
          client: body.client,
          location: body.location || undefined,
          products: productsToSave,
          type: body.type,
          noChargeReason: body.noChargeReason || "",
          subtotal: body.type === "noCharge" ? 0 : total,
          createdBy: new mongoose.Types.ObjectId(user?.user.id),
          status: "pending",
          updatedAt: new Date(),
          updatedBy: new mongoose.Types.ObjectId(user?.user.id),
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return Response.json(preorder[0], { status: 201 });

  } catch (err: any) {
    await session.abortTransaction();
    console.log("POST Preorder Error: ", err);

    if (err.type === "INVENTORY_ERROR") {
      return Response.json(
        {
          error: err.message,
          details: err.details,
        },
        { status: 400 }
      );
    }
    return Response.json(
      { error: err.message || "Unexpected Error" },
      { status: 400 }
    );
  } finally {
    session.endSession();
  }
}
