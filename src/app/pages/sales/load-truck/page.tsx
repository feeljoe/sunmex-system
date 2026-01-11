import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoadTruckWizard from "@/components/forms/LoadTruckWizard/LoadTruckWizard";

export default async function LoadTruckPage() {
    const session = await getServerSession(authOptions);

    if(!session || !["admin", "onRoute"].includes(session.user.role)) {
        return <p>Unauthorized</p>
    }

    return (
        <div className="p-10">
            <h1 className="text-3xl font-bold mb-6 text-center">Load Truck</h1>
            <LoadTruckWizard
                userRole={session.user.role}
                userId={session.user.id}
            />
        </div>
    );
}