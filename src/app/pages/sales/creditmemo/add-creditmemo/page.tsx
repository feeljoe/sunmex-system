import CreditMemoWizard from "@/components/forms/AddCreditMemoWizard/CreditMemoWizard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export default async function AddPreorderPage() {
    const session = await getServerSession(authOptions);
    return (
        <div className="flex flex-1 flex-col w-full h-full gap-5 p-5 items-center">
            <div className="flex flex-row gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h1 className="text-3xl font-bold text-center">Make a new Preorder</h1>
            </div>  
            <CreditMemoWizard userRole={session?.user?.role}></CreditMemoWizard>
        </div>
    );
  }