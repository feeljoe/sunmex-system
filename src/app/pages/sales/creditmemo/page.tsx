// pages/preorder.tsx

import { CreditMemosTable } from "@/components/tables/CreditMemoTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function PreordersPage() {
    const session = await getServerSession(authOptions);
  return (
    <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center dark:text-white">Credit Memos</h1>
        <CreditMemosTable
            userId = {session?.user?.id ?? "Not found"}
            userRole = {session?.user?.role ?? "user"}
        />
    </div>
  );
  }