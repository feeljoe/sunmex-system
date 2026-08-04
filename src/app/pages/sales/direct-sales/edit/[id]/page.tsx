import DirectSaleWizard from "@/components/forms/AddDirectSaleWizard/AddDirectSaleWizard";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function EditDirectSalePage({
    params,
}: {
    params: Promise<{id: string}>;
}) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const res = await fetch(
        `${process.env.NEXT_AUTH_URL}/api/direct-sales/${id}`,
        { cache: "no-store"}
    );

    const directSale = await res.json();
  
    if (!res.ok) {
        console.log(res.status);
        console.log(await res.text());
    }

    return (
        <div className="flex flex-1 flex-col w-full h-full gap-5 p-5 items-center">
            <div className="flex flex-row gap-4 items-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-9">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <h1 className="text-3xl font-bold text-center dark:text-white">Edit Direct Sale #{directSale.number}</h1>
            </div>  
            <DirectSaleWizard 
                userRole={session?.user?.role}
                userId={session?.user?.id}
                mode="edit"
                existingDirectSale={directSale}
            />
        </div>
    );
}