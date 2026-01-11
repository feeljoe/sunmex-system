import ReceiptWizard from "@/components/forms/AddReceiptWizard/ReceiptWizard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AddReceiptPage() {
    const session = await getServerSession(authOptions);
    const elaboratedBy = session?.user.id;
    
    return (
        <div className="flex flex-1 flex-col w-full h-full gap-10 p-10 items-center">
            <div className="flex flex-row gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h1 className="text-4xl">Receive Products</h1>
            </div>  
            <ReceiptWizard
                currentUser = {elaboratedBy ? elaboratedBy: "did not work"}
            />
        </div>
    );
  }