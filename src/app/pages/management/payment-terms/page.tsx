import { PaymentTermsTable } from "@/components/tables/PaymentTermsTable";

export default function PaymentTermsPage() {
    return (
      <div className="flex flex-col flex-1 w-full h-full gap-10 p-5">
        <h1 className="text-4xl font-bold text-center dark:text-white">Payment Terms</h1>
      <PaymentTermsTable/>
  </div>
  );
  }