import { InventoryTable } from "@/components/tables/InventoryTable";

export default function SupplierOrdersPage() {
  return (
    <div className="flex flex-col flex-1 w-full h-full p-5">
        <h1 className="text-4xl font-bold text-center mb-5">Current Inventory</h1>
        <InventoryTable/>
    </div>
  );
  }