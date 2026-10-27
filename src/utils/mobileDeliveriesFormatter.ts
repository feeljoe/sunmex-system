
import {
    getInventoryModel,
    normalizeInventoryLocation,
  } from "@/utils/inventoryResolver";
  
  const getId = (value: any): string => {
    if (!value) return "";
  
    return String(
      typeof value === "object"
        ? value._id ?? ""
        : value
    );
  };
  
  export async function formatPreOrderProducts(
    order: any
  ) {
    const inventoryLocation =
      normalizeInventoryLocation(
        order.inventoryLocation
      );
  
    const InventoryModel =
      getInventoryModel(inventoryLocation);
  
    const ids = [
      ...new Set(
        (order.products ?? [])
          .map((line: any) =>
            getId(line.productInventory)
          )
          .filter(Boolean)
      ),
    ];
  
    const inventoryRecords = await InventoryModel.find({
      _id: { $in: ids },
    })
      .populate({
        path: "product",
        populate: {
          path: "brand",
        },
      })
      .lean();
  
    const inventoryMap = new Map(
      inventoryRecords.map((inventory: any) => [
        String(inventory._id),
        inventory,
      ])
    );
  
    const products = (order.products ?? []).map(
      (line: any) => {
        const inventoryId = getId(
          line.productInventory
        );
  
        const inventory =
          inventoryMap.get(inventoryId);
  
        if (!inventory?.product) {
          throw new Error(
            `Missing ${inventoryLocation} inventory ` +
            `for PreOrder ${order._id}, ` +
            `inventory ${inventoryId}`
          );
        }
  
        const product = inventory.product;
        const picked = Number(
          line.pickedQuantity ?? 0
        );
  
        return {
          lineId: String(line._id),
          productInventory: inventoryId,
          productId: String(product._id),
          sku: product.sku,
          upc: product.upc,
          name: product.name,
          brand: product.brand?.name ?? "",
          weight: product.weight ?? "",
          uom: product.unit ?? "",
          quantity: picked,
          deliveredQuantity: Number(
            line.deliveredQuantity ?? 0
          ),
          deviationReason:
            line.deviationReason ?? null,
          unitPrice: Number(
            line.actualCost ?? 0
          ),
          inventoryLocation,
        };
      }
    );
  
    return {
      inventoryLocation,
      products: products.filter(
        (product: any) => product.quantity > 0
      ),
    };
  }
  