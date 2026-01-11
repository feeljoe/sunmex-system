import { WarehouseTruckLoadsTable } from "@/components/tables/WarehouseTruckLoadsTable";

export default function WarehousePreorderPage() {
    return (
        <div className="flex flex-1 flex-col w-full h-full gap-5 p-5">
                <h1 className="text-4xl font-bold text-center">Preorders</h1>
                <WarehouseTruckLoadsTable/>
        </div>
    );
}