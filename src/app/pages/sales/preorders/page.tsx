// pages/preorder.tsx

import { PreordersTable } from "@/components/tables/PreOrdersTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function PreordersPage() {
    const session = await getServerSession(authOptions);
  return (
    <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
        <h1 className={`text-4xl font-bold text-center dark:text-white`}>Pre Orders</h1>
        <PreordersTable
            userId = {session?.user?.id ?? "Not found"}
            userRole = {session?.user?.role ?? "user"}/>
    </div>
  );
  }