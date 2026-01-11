import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AddDirectSaleWizard from "@/components/forms/AddDirectSaleWizard/AddDirectSaleWizard";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";

export default async function NewSalePage() {
    const session = await getServerSession(authOptions);

    if(!session?.user) {
        return <div>Unauthorized</div>
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    await connectToDatabase();
    let route = null;
    if(userRole === "onRoute"){
        route = await Route.findOne({user: userId, active:true}).lean();
    }

    return (
        <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
            <h1 className="text-3xl font-bold mb-6 text-center">
                Sales
            </h1>
            {!route && (
                <p className="mt-10 text-2xl text-center">No route assigned</p>
            )}
            {route?.inventory.length<= 0 && (
                <p className="mt-10 text-2xl text-center">No inventory available</p>
            )}
            {userRole === "admin" || userRole === "onRoute" &&(
            <AddDirectSaleWizard route={route}/>
            )}
        </div>
    );
}