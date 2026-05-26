import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Route from "@/models/Route";
import { connectToDatabase } from "@/lib/db";
import { DirectSalesTable } from "@/components/tables/DirectSalesTable";

export default async function DirectSalesPage() {

  await connectToDatabase();

  const session = await getServerSession(authOptions);

  if (!session) {
    return null;
  }

  const { role, id: userId } = session.user;

  let activeRoute = null;

  if (role !== "admin") {

    activeRoute = await Route.findOne({
      user: userId,
    })
      .populate({
        path: "inventory.product",
        populate: {
          path: "brand",
        },
      })
      .lean();

    if (
      !activeRoute ||
      !activeRoute.inventory ||
      activeRoute.inventory.length === 0
    ) {
      return (
        <div className="p-10 text-center text-2xl">
          No inventory assigned to your route.
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col flex-1 w-full h-full gap-5 p-5">
      <h1 className="text-4xl font-bold text-center dark:text-white">
        Direct Sales
      </h1>

      <div className="flex items-center justify-end">
        <Link href="/pages/sales/direct-sales/new">
          <button className="flex gap-4 bg-(--primary) p-5 rounded-2xl text-white hover:text-(--quarteary) hover:bg-(--secondary) transition-all duration:300 hover:-translate-y-2 cursor-pointer">
            Make Direct Sale
          </button>
        </Link>
      </div>

      <DirectSalesTable
        userId={userId}
        isAdmin={role === "admin"}
      />
    </div>
  );
}