import { connectToDatabase } from "@/lib/db";
import CreditMemo from "@/models/CreditMemo";
import { NextResponse } from "next/server";

export async function GET() {

try {

await connectToDatabase();

const creditMemos = await CreditMemo.find({
status: "received",
warehouseStatus: "pending",
})
.populate("routeAssigned")
.populate("products.product")
.populate("createdBy");

return NextResponse.json(creditMemos);

} catch (error: any) {

console.error("Warehouse returns fetch error:", error);

return NextResponse.json(
{ error: error.message },
{ status: 500 }
);

}
}