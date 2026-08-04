import { GeneralReportsTable } from "@/components/tables/GeneralReportsTable";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
export default async function GeneralReportsPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
  return (
    <div className="flex flex-col flex-1 w-full h-full p-5">
        <h1 className="text-4xl font-bold text-center mb-5 dark:text-white">General Report</h1>
        <GeneralReportsTable
          userRole={userRole}
        />
    </div>
  );
  }