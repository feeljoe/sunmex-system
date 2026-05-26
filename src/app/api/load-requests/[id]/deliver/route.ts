import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";
import Route from "@/models/Route";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";

// 1. Updated getUser to accept the mobile app's JWT token
async function getUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET as string
      ) as any;

      if (decoded && ["admin", "driver", "vendor"].includes(decoded.role)) {
        return {
           ...decoded,
           id: decoded.id || decoded._id 
        };
      }
    } catch (error) {
      console.log("Mobile JWT Verification Failed:", error);
    }
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const user = await getUser(req);
    const { id } = await params;

    if (!["admin", "driver"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // 2. Extract the new payload from the mobile app
    const body = await req.json();
    const { products: deliveredProducts, signature } = body;

    const loadRequest = await LoadRequest.findById(id)
      .populate("products.product")
      .populate("route")
      .populate("routeAssigned");

    if (!loadRequest) {
      return NextResponse.json(
        { error: "Load request not found" },
        { status: 404 }
      );
    }

    if (loadRequest.status !== "prepared") {
      return NextResponse.json(
        { error: "Load request must be prepared first" },
        { status: 400 }
      );
    }

    const route = await Route.findById(loadRequest.route._id);

    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    // 3. Loop through database products and apply the driver's exact counts
    for (const item of loadRequest.products) {
      // Find what the driver submitted for this specific product
      const mobileData = deliveredProducts?.find(
        (p: any) => p.productId === item.product._id.toString()
      );

      // Default to 0 if not found in payload for some reason
      const deliveredQty = mobileData ? Number(mobileData.deliveredQuantity || 0) : 0;
      const differenceReason = mobileData ? mobileData.differenceReason : null;

      // Update the Load Request ledger with the driver's entries
      item.deliveredQuantity = deliveredQty;
      item.differenceReason = differenceReason;

      if (deliveredQty <= 0) continue;

      const inventory = await ProductInventory.findOne({
        product: item.product._id,
      });

      if (!inventory) {
        return NextResponse.json(
          { error: "Inventory not found" },
          { status: 404 }
        );
      }

      if (inventory.onRouteInventory < deliveredQty) {
        return NextResponse.json(
          { error: `Not enough onRoute inventory for ${item.product.name}` },
          { status: 400 }
        );
      }

      // MOVE: ProductInventory.onRoute -> Route.inventory (Vendor's Route)
      inventory.onRouteInventory -= deliveredQty;
      await inventory.save();

      const existing = route.inventory.find(
        (p: any) => p.product.toString() === item.product._id.toString()
      );

      if (existing) {
        existing.quantity += deliveredQty;
      } else {
        route.inventory.push({
          product: item.product._id,
          quantity: deliveredQty,
        });
      }
    }

    await route.save();

    // 4. Save the signature and update status
    if (signature) {
      loadRequest.signature = signature;
    }
    
    loadRequest.status = "delivered";
    await loadRequest.save();

    return NextResponse.json({
      success: true,
      loadRequest,
    });

  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      { error: err.message || "Server Error" },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}