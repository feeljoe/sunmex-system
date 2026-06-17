import { connectToDatabase } from "@/lib/db";
import DirectSale from "@/models/DirectSale";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }>}
) {
  try{
    await connectToDatabase();
    const { id } = await context.params;

    const directSale = await DirectSale.findById(id)
    .populate({
      path: "products",
        populate: {
          path: "product",
          populate: {
            path: "brand",
          },
        },
    })
    .populate("createdBy")
    .populate({
        path: "client",
        populate: {
            path: "billingAddress",
        },
    })
    .populate({
        path: "route",
        populate: {
            path: "user",
        },
    });

    if(!directSale) {
      return NextResponse.json({ error: "Direct Sale Not Found"}, {status: 404});
    }
    return NextResponse.json(directSale);
  } catch(err){
    console.error(err);
    return NextResponse.json({ error: "Server error"}, {status: 500});
  }

}