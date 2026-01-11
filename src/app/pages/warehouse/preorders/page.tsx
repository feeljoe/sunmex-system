import { WarehousePreordersTable } from "@/components/tables/WarehousePreordersTable";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function WarehousePreorderPage() {
    const session = await getServerSession(authOptions);

    return (
        <div className="flex flex-1 flex-col w-full h-full gap-5 p-5">
                <h1 className="text-4xl font-bold text-center">Preorders</h1>
                <WarehousePreordersTable
                user ={session?.user}/>
        </div>
    );
}