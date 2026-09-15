import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import ProductInventory from "@/models/ProductInventory";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// This calculates exactly how many items this specific order line is holding in each inventory bucket!
const calculateState = (status: string, qty: number, picked: number, delivered: number) => {
  const effectiveQty = Math.max(qty, picked); 
  const preSaved = effectiveQty - picked;
  
  let onRoute = 0;
  if (status === "ready") {
      onRoute = picked;
  } else if (status === "delivered") {
      onRoute = Math.max(0, picked - delivered);
  }
  
  const current = -effectiveQty;
  
  return { current, preSaved, onRoute };
};

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const session = await mongoose.startSession();
  session.startTransaction();
  const sessionUser = await getServerSession(authOptions);

  try {
    const { id } = await context.params;
    const body = await req.json();

    const { client, products, type, noChargeReason } = body;

    const preorder = await PreOrder.findById(id).session(session);

    if (!preorder) {
      throw new Error("Preorder not found");
    }

    const getIdsString = (val: any) => {
      if(!val) return;
      if(typeof val === "object" && val._id) return val._id.toString();
      return val.toString();
    };

    // -----------------------------
    // OLD MAPS
    // -----------------------------
    const oldQtyMap = new Map<string, number>();
    const oldPickedMap = new Map<string, number>();
    const oldDeliveredMap = new Map<string, number>();
    const oldReasonMap = new Map<string, string>(); 

    preorder.products.forEach((p: any) => {
      const idStr = getIdsString(p.productInventory);
      oldQtyMap.set(idStr, p.quantity);
      oldPickedMap.set(idStr, p.pickedQuantity ?? 0);
      oldDeliveredMap.set(idStr, p.deliveredQuantity ?? 0);
      oldReasonMap.set(idStr, p.deviationReason ?? "");
    });

    // -----------------------------
    // NEW MAPS
    // -----------------------------
    const newQtyMap = new Map<string, number>();
    const newPickedMap = new Map<string, number>();
    const newDeliveredMap = new Map<string, number>();
    const newReasonMap = new Map<string, string>();

    products.forEach((p: any) => {
      const idStr = getIdsString(p.productInventory);
      let pk = p.pickedQuantity ?? 0;
      let del = p.deliveredQuantity ?? 0;
      let rsn = p.deviationReason || null;

      // Sanitize inputs based on status to prevent ghost math
      if (preorder.status === "pending" || preorder.status === "assigned") {
         pk = 0; del = 0; rsn = null;
      } else if (preorder.status === "ready") {
         del = 0; rsn = null;
      }

      newQtyMap.set(idStr, p.quantity);
      newPickedMap.set(idStr, pk);
      newDeliveredMap.set(idStr, del);
      newReasonMap.set(idStr, rsn);
    });

    const allIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
    const failedItems: any[] = [];
    const inventoryDocs = new Map<string, any>();

    // -----------------------------
    // PREVALIDATION
    // -----------------------------
    for (const inventoryId of allIds) {
      const inventory = await ProductInventory.findById(inventoryId).populate("product").session(session);
      inventoryDocs.set(inventoryId, inventory);

      if(!inventory){
        failedItems.push({ inventoryId, message: "Inventory Not Found" });
        continue;
      }

      const oldQty = oldQtyMap.get(inventoryId) || 0;
      const newQty = newQtyMap.get(inventoryId) || 0;
      const oldPicked = oldPickedMap.get(inventoryId) || 0;
      const newPicked = newPickedMap.get(inventoryId) || 0;
      const oldDelivered = oldDeliveredMap.get(inventoryId) || 0;
      const newDelivered = newDeliveredMap.get(inventoryId) || 0;
      const newReason = newReasonMap.get(inventoryId) || null;

      // RULE CHECKS
      if (preorder.status === "ready" || preorder.status === "delivered") {
          if(newPicked > newQty){
            failedItems.push({ inventoryId, name: inventory.product?.name, type: "picked", message: "Picked quantity exceeds ordered quantity" });
          }
      }

      if (preorder.status === "delivered") {
          if(newDelivered > newPicked) {
            failedItems.push({ inventoryId, name: inventory.product?.name, type: "delivered", message: "Delivered exceeds picked quantity" });
          }
          if (newPicked > newDelivered && !newReason) {
            failedItems.push({ inventoryId, name: inventory.product?.name, type: "reason", message: "A deviation reason is required because Picked exceeds Delivered." });
          }
      }
      
      // Calculate exactly how much this item's footprint changes in the database
      const oldState = calculateState(preorder.status, oldQty, oldPicked, oldDelivered);
      const newState = calculateState(preorder.status, newQty, newPicked, newDelivered);

      const deltaCurrent = newState.current - oldState.current;
      const deltaPreSaved = newState.preSaved - oldState.preSaved;
      const deltaOnRoute = newState.onRoute - oldState.onRoute;

      // Make sure our changes won't push the physical database below 0!
      if (inventory.currentInventory + deltaCurrent < 0) {
        failedItems.push({ inventoryId, name: inventory.product?.name, type: "quantity", message: "Not enough current inventory", requested: Math.abs(deltaCurrent), available: inventory.currentInventory });
      }
      if (inventory.preSavedInventory + deltaPreSaved < 0) {
        failedItems.push({ inventoryId, name: inventory.product?.name, type: "picked", message: "Not enough reserved inventory to pick.", requested: Math.abs(deltaPreSaved), available: inventory.preSavedInventory });
      }
      if (inventory.onRouteInventory + deltaOnRoute < 0) {
        failedItems.push({ inventoryId, name: inventory.product?.name, type: "delivered", message: "Not enough on-route inventory to deliver.", requested: Math.abs(deltaOnRoute), available: inventory.onRouteInventory });
      }
    }

    if(failedItems.length > 0){
      throw { type: "INVENTORY_ERROR", message: "Some changes could not be applied", details: failedItems };
    }

    // -----------------------------
    // APPLY CHANGES
    // -----------------------------
    for(const inventoryId of allIds){
      const inventory = inventoryDocs.get(inventoryId);

      const oldQty = oldQtyMap.get(inventoryId) || 0;
      const newQty = newQtyMap.get(inventoryId) || 0;
      const oldPicked = oldPickedMap.get(inventoryId) || 0;
      const newPicked = newPickedMap.get(inventoryId) || 0;
      const oldDelivered = oldDeliveredMap.get(inventoryId) || 0;
      const newDelivered = newDeliveredMap.get(inventoryId) || 0;

      const oldState = calculateState(preorder.status, oldQty, oldPicked, oldDelivered);
      const newState = calculateState(preorder.status, newQty, newPicked, newDelivered);

      // Apply the mathematical differences directly! No more inactiveInventory bleeding!
      inventory.currentInventory += (newState.current - oldState.current);
      inventory.preSavedInventory += (newState.preSaved - oldState.preSaved);
      inventory.onRouteInventory += (newState.onRoute - oldState.onRoute);

      await inventory.save({session});
    }

    // -----------------------------
    // UPDATE PREORDER
    // -----------------------------
    preorder.client = client;
    preorder.type = type;
    preorder.noChargeReason = noChargeReason;

    preorder.products = products.map((p: any) => {
      let pk = p.pickedQuantity ?? 0;
      let del = p.deliveredQuantity ?? 0;
      let rsn = p.deviationReason || null;

      // Sanitize the save payload as well
      if (preorder.status === "pending" || preorder.status === "assigned") {
         pk = 0; del = 0; rsn = null;
      } else if (preorder.status === "ready") {
         del = 0; rsn = null;
      }

      return {
        productInventory: p.productInventory,
        quantity: p.quantity,
        pickedQuantity: pk,
        deliveredQuantity: del,
        deviationReason: (preorder.status === "delivered" && pk > del) ? rsn : null,
        actualCost: p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0,
      };
    });

    preorder.subtotal = products.reduce((sum: number, p: any) => sum + p.quantity * (p.effectiveUnitPrice ?? p.unitPrice ?? p.actualCost ?? 0), 0);
    
    // Only calculate delivered total if it's actually delivered
    if (preorder.status === "delivered") {
        preorder.total = preorder.products.reduce((sum: number, p: any) => sum + p.deliveredQuantity * p.actualCost, 0);
    } else {
        preorder.total = 0;
    }
    
    preorder.updatedBy = sessionUser?.user.id;
    preorder.updatedAt = new Date();

    await preorder.save({session});
    await session.commitTransaction();
    return NextResponse.json({success: true});

  } catch (err: any) {
    await session.abortTransaction();
    console.error("PATCH Preorder error: ", err);

    if(err.type === "INVENTORY_ERROR") {
      return NextResponse.json({ error: err.message, details: err.details }, {status: 400});
    }
    return NextResponse.json({ error: err.message || "Unexpected Error" }, { status: 400 });
  } finally {
    session.endSession();
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  try{
    await connectToDatabase();
    const { id } = await context.params;

    const preorder = await PreOrder.findById(id)
    .populate({
      path: "products.productInventory",
        populate: {
          path: "product",
          populate: {
            path: "brand",
          },
        },
    })
    .populate("client")
    .populate("routeAssigned");

    if(!preorder) {
      return NextResponse.json({ error: "Preorder Not Found"}, {status: 404});
    }
    return NextResponse.json(preorder);
  } catch(err){
    console.error(err);
    return NextResponse.json({ error: "Server error"}, {status: 500});
  }
}