import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";

export async function GET(){
    const session = await getServerSession(authOptions);

    const route = await Route.findOne({
        users: session?.user.id,
    });
    const preorders = await PreOrder.find({
        routeAssigned: route._id,
        status: {$in: ["ready"]},
    })
    .populate("client")
    .populate("products.productInventory");

    return Response.json(preorders);

}