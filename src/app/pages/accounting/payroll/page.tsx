import AccountingPayrollTable from "@/components/tables/AccountingPayrollTable";

export default function AccountingPayrollPage(){
    return (
            <div className="flex flex-col flex-1 w-full h-full p-5">
                <h1 className="text-4xl font-bold text-center dark:text-white mb-4">Accounting - Payroll</h1>
                <AccountingPayrollTable/>
            </div>
        );
}