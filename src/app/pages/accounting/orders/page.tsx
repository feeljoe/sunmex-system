import AccountingOrdersTable from "@/components/tables/AccountingOrders";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export default async function AccountingSuppliersReceiptsPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role;
    return (
        <div className="flex flex-col flex-1 w-full h-full p-5">
            <h1 className="text-4xl font-bold text-center dark:text-white mb-4">Accounting - Supplier Receipts</h1>
            <AccountingOrdersTable
            userRole={userRole === "admin" ? "admin": "no-access"}
            />
        </div>
    );
  }