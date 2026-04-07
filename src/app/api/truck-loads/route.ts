import { connectToDatabase } from "@/lib/db";
import TruckLoad from "@/models/TruckLoad";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const load = await TruckLoad.create({
    route: body.routeId,
    products: body.products.map((p: any) => ({
      productInventory: p.inventoryId,
      quantity: p.quantity,
    })),
    createdBy: session.user.id,
  });

  return NextResponse.json(load);
}
