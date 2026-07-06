import ForeignInventoryTable  from "@/components/tables/ForeignInventoryTable";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
export default async function ForeignInventoryPage() {
    const session = await getServerSession(authOptions);
  return (
    <div className="flex flex-col flex-1 w-full h-full p-5">
        <h1 className="text-4xl font-bold text-center mb-5 dark:text-white">Foreign Inventory</h1>
        <ForeignInventoryTable
            userId={session?.user?.id}
        />
    </div>
  );
  }