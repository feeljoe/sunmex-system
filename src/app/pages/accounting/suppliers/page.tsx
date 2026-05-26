import { AccountingSupplierReceiptsTable } from "@/components/tables/AccountingSupplierReceipts";
export default function AccountingSuppliersReceiptsPage() {
    return (
        <div className="flex flex-col flex-1 w-full h-full p-5">
            <h1 className="text-4xl font-bold text-center dark:text-white mb-4">Accounting - Supplier Receipts</h1>
            <AccountingSupplierReceiptsTable/>
        </div>
    );
  }