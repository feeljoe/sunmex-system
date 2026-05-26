import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import LoadRequest from "@/models/LoadRequest";
import ProductInventory from "@/models/ProductInventory";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 🔐 auth helper
async function getUser() {
  const session = await getServerSession(authOptions);

  if(!session?.user) throw new Error("Unauthorized");

  return session.user;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const user = await getUser();
    const { id } = await params;

    // Only warehouse or admin
    if (!["admin", "warehouse"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { products } = body;

    const loadRequest = await LoadRequest.findById(id);

    if (!loadRequest) {
      return NextResponse.json(
        { error: "Load request not found" },
        { status: 404 }
      );
    }

    if (loadRequest.status !== "assigned") {
      return NextResponse.json(
        { error: "Request must be assigned first" },
        { status: 400 }
      );
    }

    // 🧠 Process each product
    for (const item of products) {
      const inventory = await ProductInventory.findOne({
        product: item.product
      });

      if (!inventory) {
        return NextResponse.json(
          { error: "Inventory not found" },
          { status: 404 }
        );
      }

      // ❗ prevent negative stock
      if (inventory.preSavedInventory < item.assembledQuantity) {
        return NextResponse.json(
          {
            error: "Not enough reserved inventory available",
            product: item.product,
          },
          { status: 400 }
        );
      }

      // 📉 deduct warehouse stock
      inventory.preSavedInventory -= item.assembledQuantity;
      inventory.onRouteInventory += item.assembledQuantity;

      await inventory.save();
    }

    loadRequest.products = loadRequest.products.map(
        (existing: any) => {
            const picked = products.find(
                (p: any) =>
                    p.product ===
                        existing.product.toString()
            );

            if(!picked){
                return existing;
            }
            return {
                ...existing.toObject(),
                assembledQuantity: picked.assembledQuantity,
                differenceReason: picked.differenceReason || null,
            };
        }
    );

    // update request
    loadRequest.status = "prepared";
    loadRequest.assembledBy = user.id;
    await loadRequest.save();

    return NextResponse.json({
      success: true,
      message: "Load request prepared successfully",
      loadRequest,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}