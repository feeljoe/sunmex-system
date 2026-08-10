import { SuppliersTable } from "@/components/tables/SuppliersTable";

export default function SuppliersPage() {
    return (
    <div className="flex flex-col flex-1 w-full h-full p-2">
        <h1 className="text-4xl font-bold text-center dark:text-white">Suppliers</h1>
      <SuppliersTable/>
  </div>
  );
  }
  