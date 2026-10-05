import { WarehousePreordersTable } from "@/components/tables/WarehousePreordersTable";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function WarehousePreorderPage() {
    const session = await getServerSession(authOptions);
    const location = (session?.user as any).location || "phoenix";
    const locationLabel: Record<string, string> = {
        phoenix: "Phoenix",
        yuma: "Yuma",
        tucson: "Tucson",
        elPaso: "El Paso",
        lasVegas: "Las Vegas",
    };

    return (
        <div className="flex flex-1 flex-col w-full h-full gap-2 p-2">
                <h1 className="flex flex-col text-2xl md:text-4xl font-bold text-center dark:text-white">
                    Preorders
                    <span className="md:hidden text-lg">Warehouse:{" "}
                        <span className="text-blue-700">
                            {locationLabel[location]}
                        </span>
                    </span>
                </h1>
                <WarehousePreordersTable
                user ={session?.user}/>
        </div>
    );
}