import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardClient from "@/components/tables/DashboardClient";

export default async function DashboardPage(){
    const session = await getServerSession(authOptions);
    const userRole = session?.user?.role || "unauthorized";
    return (
        <div className="flex flex-col flex-1 w-full h-full p-2 dark:bg-gray-900">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-2">
                <div className="flex justify-between w-full">
                    <h1 className="text-3xl font-bold dark:text-white flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                        </svg>
                        Dashboard
                    </h1>
                    <div>
                    <p className="text-gray-500 mt-1">Welcome back,</p>
                    <p className="text-gray-500 mt-1">{session?.user?.name}</p>
                    </div>
                </div>
            </div>

            {/* Interactive Client Component */}
            <DashboardClient userRole={userRole} />
        </div>
    );
}