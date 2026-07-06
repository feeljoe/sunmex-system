import CommissionsTable from "@/components/tables/CommissionsTable";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function CommissionsPage() {
    const session = await getServerSession(authOptions);
    return (
        <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
            <h1 className="text-4xl font-bold text-center dark:text-white">Commissions Settings</h1>
            <CommissionsTable
                userId ={session?.user?.id ?? "Not found"}
            />
        </div>
    );
  }