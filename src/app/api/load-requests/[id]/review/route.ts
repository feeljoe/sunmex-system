import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";
import Product from "@/models/Product";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Extract user from JWT
async function getUser() {
  const session = await getServerSession(authOptions);

  if(!session?.user) throw new Error("Unauthorized");

  return session.user;
}

//
// PATCH -> Admin Review Load Request
//
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const user = await getUser();

    // Only admin can review
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { products } = await req.json();

    const loadRequest = await LoadRequest.findById(id);

    if (!loadRequest) {
      return NextResponse.json(
        { error: "Load request not found" },
        { status: 404 }
      );
    }

    if (loadRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending requests can be reviewed" },
        { status: 400 }
      );
    }

    // Validate products against warehouse inventory
    const validatedProducts = [];

    let hasApprovedProducts = false;

    for (const p of products) {
      const product = await Product.findById(p.product);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${p.product}` },
          { status: 404 }
        );
      }

      const inventory = await ProductInventory.findOne({
        product: p.product,
      });

      const available = inventory?.currentInventory || 0;

      const approvedQuantity = Number(p.quantity || 0);

      if(approvedQuantity < 0) {
        return NextResponse.json(
            {
                error: `Invalid quantity for: ${product.name}`,
            },
            { status: 400 }
        );
      }

      if (approvedQuantity > available) {
        return NextResponse.json(
          {
            error: `Not enough inventory for ${product.name}`,
            available,
          },
          { status: 400 }
        );
      }

      if(approvedQuantity > 0) {
        hasApprovedProducts = true;

        await ProductInventory.findOneAndUpdate(
            { product: p.product },
            {
                $inc: {
                    currentInventory: -approvedQuantity,
                    preSavedInventory: approvedQuantity,
                },
            }
        );
      }

      validatedProducts.push({
        product: p.product,
        requestedQuantity: p.requestedQuantity,
        approvedQuantity: approvedQuantity,
      });
    }

    // Update request
    loadRequest.products = validatedProducts;
    loadRequest.status = hasApprovedProducts
    ? "approved"
    : "rejected";
    loadRequest.reviewedBy = user.id;
    loadRequest.reviewedAt = new Date();
    await loadRequest.save();


    return NextResponse.json({
      message: hasApprovedProducts 
        ? "Load request approved and inventory reserved"
        : "Load request rejected",
      loadRequest,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}