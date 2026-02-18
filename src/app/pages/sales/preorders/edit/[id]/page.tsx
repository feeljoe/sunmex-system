import PreorderWizard from "@/components/forms/AddPreorderWizard/PreorderWizard";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
export default async function EditPreorderPage({
    params,
}: {
    params: Promise<{id: string}>;
}) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const res = await fetch(
        `${process.env.NEXT_AUTH_URL}/api/preOrders/${id}`,
        { cache: "no-store"}
    );

    const preorder = await res.json();
  
    if (!res.ok) {
        console.log(res.status);
        console.log(await res.text());
      }
    return (
        <>
        <div className="flex flex-col justify-center text-center">
            <h1 className="text-4xl p-2 mb-4">Edit Preorder</h1>
        </div>
        <div className="w-full p-2">
            <PreorderWizard
                userRole={session?.user?.role}
                mode="edit"
                existingPreorder={preorder}
            />
      </div>
      </>
    );
  }