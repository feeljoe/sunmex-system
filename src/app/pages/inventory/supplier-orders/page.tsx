import { SupplierOrdersTable } from "@/components/tables/SupplierOrdersTable";

export default function SupplierOrdersPage() {
  return (
    <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center dark:text-white">Supplier Orders</h1>
        <SupplierOrdersTable/>
    </div>
  );
  }