import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import Route from "@/models/Route";
import Product from "@/models/Product";
import jwt from "jsonwebtoken";
import CounterLoadRequest from "@/models/CounterLoadRequest";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

//
// POST -> Create Load Request
//
export async function POST(req: Request) {
  try {
    await connectToDatabase();

    // Pass the req object so we can read headers!
    const user = await getUser(req);

    const { routeId, products } = await req.json();

    if (!routeId || !products?.length) {
      return NextResponse.json(
        { error: "Missing route or products" },
        { status: 400 }
      );
    }

    // Validate route
    const route = await Route.findById(routeId);
    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    // Validate products
    for (const p of products) {
        console.log("Products: ", p);
      if (!p.product || !p.requestedQuantity || p.requestedQuantity <= 0) {
        return NextResponse.json(
          { error: "Invalid product data" },
          { status: 400 }
        );
      }

      const exists = await Product.findById(p.product);
      if (!exists) {
        return NextResponse.json(
          { error: `Product not found: ${p.product}` },
          { status: 404 }
        );
      }
    }
    const counter = await CounterLoadRequest.findOneAndUpdate(
        {name: "loadRequest" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true}
      );
      let nextNumber =  `LR-${route.code}-${1000 + counter.seq}`;

    const loadRequest = await LoadRequest.create({
      LRNumber: nextNumber,
      route: routeId,
      requestedBy: user.userId,
      products,
    });

    return NextResponse.json({
      message: "Load request created",
      loadRequest,
    });
  } catch (err: any) {
    console.error("Post load request error: ", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

//
// GET -> Get My Load Requests
//

// Make sure to add req: Request here as well!
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const user = await getUser(req);
    const userId = user.userId;

    const route = await Route.findOne({
      user: userId,
    });

    if (!route) {
      return NextResponse.json([]);
    }
    const loadRequests = await LoadRequest.find({
      routeAssigned: route._id,
      status: {
        $in: ["prepared", "delivered"],
      },
      
    })
      .populate("routeAssigned", "code")
      .populate("route", "code")
      .populate("requestedBy", "firstName lastName")
      .populate("assembledBy", "firstName lastName")
      .populate({ 
        path: "products.product",
        populate: { path: "brand"}})
      .sort({ createdAt: -1 })
      .lean(); 

    // Format the data to perfectly match the LoadRequestDelivery interface
    const formattedLoadRequests = loadRequests.map((lr: any) => ({
      _id: lr._id.toString(),
      type: "loadRequest",
      LRNumber: lr.LRNumber,
      status: lr.status,
      routeAssigned: {
        _id: lr.routeAssigned?._id?.toString(),
        code: lr.routeAssigned?.code || "",
      },
      route: {
        _id: lr.route?._id?.toString(),
        code: lr.route?.code || "",
      },
      requestedBy: lr.assembledBy ? {
        firstName: lr.requestedBy.firstName,
        lastName: lr.requestedBy.lastName,
      } : undefined,
      assembledBy: lr.assembledBy ? {
        firstName: lr.assembledBy.firstName,
        lastName: lr.assembledBy.lastName,
      } : undefined,
      products: lr.products.map((p: any) => ({
        product: {
          _id: p.product?._id?.toString(),
          brand: p.product?.brand?.name,
          name: p.product?.name || "Unknown Product",
          sku: p.product?.sku || "",
          upc: p.product?.upc || "",
          uom: p.product?.unit || "",
          weight: p.product?.weight || "",
        },
        approvedQuantity: p.approvedQuantity || 0,
        assembledQuantity: p.assembledQuantity || 0,
        deliveredQuantity: p.deliveredQuantity || 0,
        differenceReason: p.differenceReason || "",
      })),
      createdAt: lr.createdAt,
    }));

    return NextResponse.json(formattedLoadRequests);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}