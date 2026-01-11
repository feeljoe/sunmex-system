// pages/directsale.tsx

import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActiveRouteForUser } from "@/services/routes/getActiveRouteForUser";
import { DirectSalesTable } from "@/components/tables/DirectSalesTable";

export default async function DirectSalesPage() {
    const session = await getServerSession(authOptions);

    if(!session){
        return;
    }
    const { role, id: userId } = session.user;


    let activeRoute = null;

    if(role !== "admin"){
        activeRoute = await getActiveRouteForUser(userId);

        if(!activeRoute || activeRoute.inventory.length === 0){
            return (
                <div className="p-10 text-center text-2xl">
                    No inventory assigned to your route.
                </div>
            );
        }
    }
  return (
    <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
        <h1 className="text-4xl font-bold text-center">Direct Sales</h1>
        <div className="flex items-center justify-end">
            <Link href="/pages/sales/direct-sales/new">
            <button className="flex gap-4 bg-(--primary) p-5 rounded-2xl text-white hover:text-(--quarteary) hover:bg-(--secondary) transition-all duration:300 hover:-translate-y-2 cursor-pointer">
                Make Direct Sale
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
            </button>
            </Link>
        </div>
        <DirectSalesTable route={activeRoute}/>
    </div>
  );
  }