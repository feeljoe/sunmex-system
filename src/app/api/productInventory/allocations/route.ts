import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import ForeignInventory from "@/models/ForeignInventory";
import PreOrder from "@/models/PreOrder";
import User from "@/models/User";
import "@/models/Client";
import "@/models/Route";

type AllocationType = "presaved" | "onRoute";

const LOCATIONS = [
    "phoenix",
    "yuma",
    "tucson",
    "elPaso",
    "lasVegas",
] as const;

type InventoryLocation = typeof LOCATIONS[number];

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if(!session?.user?.id) {
            return NextResponse.json({error: "Unauthorized"}, {status:401});
        }
        await connectToDatabase();
        
        if(!session.user || !["admin", "warehouse"].includes(session.user.role)){
            return NextResponse.json({error: "Forbidden"}, {status: 403});
        }
        const { searchParams } = new URL(req.url);
        const inventoryId = searchParams.get("inventoryId");
        const inventoryLocation = searchParams.get("inventoryLocation");
        const allocation = searchParams.get("allocation") as AllocationType;

        if(!inventoryId || !mongoose.Types.ObjectId.isValid(inventoryId)){
            return NextResponse.json({error: "Invalid inventory id"}, {status: 400});
        }
        if(!inventoryLocation || !LOCATIONS.includes(inventoryLocation as InventoryLocation)){
            return NextResponse.json({error: "Invalid inventory location"}, {status: 400});
        }
        if(allocation !== "presaved" && allocation !== "onRoute") {
            return NextResponse.json({error: "Invalid allocation type"}, {status: 400});
        }
        const useForeignInventory = inventoryLocation !== "phoenix";
        const InventoryModel = useForeignInventory
            ? ForeignInventory : ProductInventory;
        
        const inventory = await InventoryModel.findOne({
            _id: inventoryId,
            ...(useForeignInventory ? {location: inventoryLocation} : {}),
        })
            .populate({
                path: "product",
                populate: {
                    path: "brand",
                },
            })
            .lean();

        if(!inventory) {
            return NextResponse.json({error: "Inventory not found in the selected warehouse"}, {status: 404});
        }
        const product: any = inventory.product;
        if(!product){
            return NextResponse.json({error: "Inventory Product not Found"}, {status: 404});
        }
        const statuses = allocation === "presaved" ? ["pending", "assigned"] : ["ready"];

        const locationFilter = inventoryLocation === "phoenix"
            ? {
                $or: [
                    {inventoryLocation: "phoenix"},
                    {inventoryLocation: null},
                ],
            }
            : {
                inventoryLocation,
            };

        const preorders = await PreOrder.find({
            ...locationFilter,
            status: {$in: statuses},
            "products.productInventory": inventory._id,
        }).select("_id number status createdAt client routeAssigned products")
        .populate("client", "clientName")
        .populate("routeAssigned", "code")
        .sort({createdAt: -1})
        .lean();

        const items = preorders.map((preorder: any) => {
            const matchingLines = preorder.products.filter((line: any) =>
                String(line.productInventory) === String(inventory._id));
            const quantity = matchingLines.reduce((sum: number, line: any) => {
                const allocated = allocation === "presaved" ? Number(line.quantity ?? 0) : Number(line.pickedQuantity ?? 0);
                return sum + allocated;
            }, 0);

            return {
                _id: preorder._id,
                number: preorder.number,
                client: preorder.client?.clientName ?? "-",
                route: preorder.routeAssigned?.code ?? "-",
                status: preorder.status,
                createdAt: preorder.createdAt,
                quantity,
            };
        }).filter((item) => item.quantity > 0);

        const allocatedQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const inventoryQuantity = allocation === "presaved" ? Number(inventory.preSavedInventory ?? 0) : Number(inventory.onRouteInventory ?? 0);

        return NextResponse.json({
            items,
            product: {
                _id: product._id,
                name: `${product.name} ${product.weight ?? ""}${product.unit?.toUpperCase() ?? ""}`.trim(),
                sku: product.sku,
                brand: product.brand?.name ?? "",
            },
            allocation,
            inventoryLocation,
            inventoryQuantity,
            allocatedQuantity,
            difference: inventoryQuantity - allocatedQuantity,
            userRole: session.user.role,
        });
    } catch (error: any) {
        console.error("GET INVENTORY ALLOCATIONS ERROR: ",  error);
        return NextResponse.json({error: error.message ?? "Failed to fetch inventory allocations"}, {status: 500});
    }
}