import ReceiptWizard from "@/components/forms/AddReceiptWizard/ReceiptWizard";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AddReceiptPage() {
    const session = await getServerSession(authOptions);
    const elaboratedBy = session?.user.id;
    
    return (
        <div className="flex flex-1 flex-col w-full h-full p-2 items-center"> 
            <ReceiptWizard
                currentUser = {elaboratedBy ? elaboratedBy: "did not work"}
            />
        </div>
    );
  }