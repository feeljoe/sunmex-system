import { getServerSession } from "next-auth";
import Route from "@/models/Route";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import PreOrder from "@/models/PreOrder";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  //const today = new Date();
  //const dayName = today.toLocaleDateString("en-US", {weekday: "long"});

  //const startOfDay = new Date(today);
  //startOfDay.setHours(0,0,0,0);

  //const endOfDay = new Date(today);
  //endOfDay.setHours(23, 59, 59, 999);

  const routes = await Route.find({
    user: userId,
    active: true,
  }).populate({
    path: "clients",
    //match: {
    //  visitingDays: dayName.toUpperCase(),
    //}
  });

    const routeClients = routes.flatMap((r: any) => r.clients) || [];

    //const usedClientIds = await PreOrder.find({
    //  createdBy: userId,
    //  createdAt: {
    //    $gte: startOfDay,
    //    $lte: endOfDay,
    //  },
    //  status: {$ne: "cancelled"},
    //}).distinct("client");

    const availableClients = routeClients;//.filter(
      //(c: any) => 
      //  !usedClientIds.some(
      //    (id) => id.toString() === c._id.toString()
      //)
    //);

  return NextResponse.json({
    items: availableClients,
    total: availableClients.length,
  });
}
