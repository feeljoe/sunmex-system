import mongoose from "mongoose";
import Route from "@/models/Route";
import ProductInventory from "@/models/ProductInventory";

interface LoadItem {
    productId: string,
    quantity: number,
}

export async function loadRouteInventory(
    routeId: string,
    items: LoadItem[]
) {
    if(!items.length){
        throw new Error("No items provided to load");
    }

    const session = await mongoose.startSession();

    try{
        session.startTransaction();

        const route = await Route.findById(routeId).session(session);
        if(!route) {
            throw new Error("Route not found");
        }
        for (const item of items) {
            const {productId, quantity} = item;

            if(quantity <= 0) {
                throw new Error("Invalid quantity");
            }

            const inventory = await ProductInventory.findOne({
                product: productId,
            }).session(session);

            if(!inventory){
                throw new Error("Product inventory not found");
            }

            if(inventory.currentInventory < quantity){
                throw new Error(`Not enough stock for product ${inventory.product.name}`);
            }

            inventory.currentInventory -= quantity;
            inventory.onRouteInventory += quantity;

            await inventory.save({session});

            const existingItem = route.inventory.find(
                (i:any) => i.product.toString() === productId
            );
            if(existingItem){
                existingItem.quantity += quantity;
            }else {
                route.inventory.push({
                    product: productId,
                    quantity,
                });
            }
        }

        await route.save({session});

        await session.commitTransaction();
        session.endSession();

        return route;
    }catch(error){
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
}