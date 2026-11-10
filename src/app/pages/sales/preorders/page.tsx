// pages/preorder.tsx

import { PreordersTable } from "@/components/tables/PreOrdersTable";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function PreordersPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-2 overflow-hidden p-2">
      <h1 className="shrink-0 text-center text-2xl font-bold dark:text-white md:text-4xl">
        Pre Orders
      </h1>

      <PreordersTable
        userId={session?.user?.id ?? "Not found"}
        userRole={session?.user?.role ?? "user"}
      />
    </div>
  );
}
