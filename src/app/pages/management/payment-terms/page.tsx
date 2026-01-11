import { PaymentTermsTable } from "@/components/tables/PaymentTermsTable";
import Link from "next/link";

export default function PaymentTermsPage() {
    return (
      <div className="flex flex-col flex-1 w-full h-full gap-10 p-5">
        <h1 className="text-4xl font-bold text-center">Payment Terms</h1>
      <div className="flex items-center justify-end">
          <Link href="/pages/management/payment-terms/add-payment-term">
          <button className="flex gap-4 bg-(--primary) p-5 rounded-2xl text-white hover:text-(--quarteary) hover:bg-(--secondary) transition-all duration:300 hover:-translate-y-2 cursor-pointer">
              Add Payment Term
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
</svg>
          </button>
          </Link>
          
      </div>
      <PaymentTermsTable/>
  </div>
  );
  }