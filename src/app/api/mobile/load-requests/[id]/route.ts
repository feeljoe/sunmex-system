import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const lr = await LoadRequest.findById(id)
      .populate("route", "code")
      .populate("requestedBy", "firstName lastName")
      .populate("routeAssigned", "code")
      .populate("assembledBy", "firstName lastName")
      .populate({
        path: "products.product",
        populate: { path : "brand"}
      })
      .lean();

      if (!lr) {
        return NextResponse.json(
          { error: "Not found" },
          { status: 404 }
        );
      }

      const formattedProducts = lr.products.map((p: any) => ({
          product: {
            _id: p.product?._id?.toString(),
            brand: p.product?.brand ? {
              _id: p.product?.brand?._id.toString(),
              name: p.product?.brand?.name,
            } : undefined,
            name: p.product?.name || "Unknown Product",
            sku: p.product?.sku || "",
            upc: p.product?.upc || "",
            uom: p.product?.unit || "",
            weight: p.product?.weight || "",
          },
          requestedQuantity: p.requestedQuantity || 0,
          approvedQuantity: p.approvedQuantity || 0,
          assembledQuantity: p.assembledQuantity || 0,
          deliveredQuantity: p.deliveredQuantity || 0,
          differenceReason: p.differenceReason || "",
        }));

        const formatted = {
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
        products: formattedProducts,
        createdAt: lr.createdAt,
        }

    return NextResponse.json(formatted);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    // Get the updated products array sent from the mobile app
    const { products } = await req.json();

    const { id } = await params;

    // 1. Find the existing load request
    const existingReq = await LoadRequest.findById(id);
    
    if (!existingReq) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    
    // 2. Security Check: Only allow edits if it is still pending
    if (existingReq.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending requests can be modified" }, 
        { status: 400 }
      );
    }

    // 3. Apply the changes and save
    existingReq.products = products;
    await existingReq.save();

    return NextResponse.json({ 
      message: "Updated successfully", 
      loadRequest: existingReq 
    });
    
  } catch (err: any) {
    console.error("PATCH Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}