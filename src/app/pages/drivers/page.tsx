
import DriverPreordersTable from "@/components/tables/DriverPreordersTable";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
export default async function DriversPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-1 flex-col w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center">Driver Routes</h1>
        
        <DriverPreordersTable
          userRole = {session?.user?.role}
          />
    </div>
  );
  }