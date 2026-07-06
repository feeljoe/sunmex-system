import BonusesDeductionsTable from "@/components/tables/BonusesDeductionsTable";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function BonusesDeductionsPage() {
    const session = await getServerSession(authOptions);
    return (
        <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
            <h1 className="text-4xl font-bold text-center dark:text-white">Bonuses / Deductions Settings</h1>
            <BonusesDeductionsTable
                userId ={session?.user?.id ?? "Not found"}
            />
        </div>
    );
  }