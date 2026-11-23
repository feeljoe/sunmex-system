import mongoose from "mongoose";
import { DateTime } from "luxon";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import SupplierReceipt from "@/models/SupplierReceipt";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, context: {params: Promise<{id: string}>}) {
    const auth = await getServerSession(authOptions);
    
    if(!auth?.user?.id) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }
    if (auth.user.role !== "admin") {
        return NextResponse.json({error: "Admin authorization required"}, {status: 403});
    }
    const {id} = await context.params;
    if(!mongoose.isValidObjectId(id)){
        return NextResponse.json({error: "Invalid supplier receipt ID"}, {status: 400});
    }
    const body = await req.json().catch(() => null);
    const paymentId = body?.paymentId;
    const paymentDate = body?.paymentDate;
    if(typeof paymentId !== "string" || !mongoose.isValidObjectId(paymentId)){
        return NextResponse.json({error: "Invalid payment ID"}, {status: 400});
    }
    if(typeof paymentDate !== "string") {
        return NextResponse.json({error: "Payment date is required"}, {status: 400});
    }
    const parsedDate = DateTime.fromFormat(paymentDate, "yyyy-MM-dd", {zone: "America/Phoenix"});
    if(!parsedDate.isValid || parsedDate.toFormat("yyyy-MM-dd") !== paymentDate) {
        return NextResponse.json({error: "Payment date is invalid"}, {status: 400});
    }
    const newDate = parsedDate
    .set({
      hour: 12,
      minute: 0,
      second: 0,
      millisecond: 0,
    })
    .toJSDate();
    await connectToDatabase();
    const session = await mongoose.startSession();
    try {
        let responseData: any = null;
        await session.withTransaction(async () => {
            const receipt = await SupplierReceipt.findById(id).session(session);
            if(!receipt) throw new Error("RECEIPT_NOT_FOUND");
            const payment = receipt.payments.id(paymentId);
            if(!payment) throw new Error("PAYMENT_NOT_FOUND");
            const previousDate = payment.date ?? null;
            const previousPhoenixDay = previousDate ? DateTime.fromJSDate(new Date(previousDate)).setZone("America/Phoenix").toFormat("yyyy-MM-dd") : null;
            if (previousPhoenixDay === paymentDate) {
                responseData = {
                    success: true,
                    unchanged: true,
                    paymentId,
                    date: payment.date,
                    dateUpdatedBy: payment.dateUpdatedBy,
                    dateUpdatedAt: payment.dateUpdatedAt,
                    dateChangeHistory: payment.dateChangeHistory,
                  };
          
                  return;
            }
            const updatedAt = new Date();
            payment.dateChangeHistory.push({previousDate, newDate, changedBy: auth.user.id, changedAt: updatedAt});
            payment.date = newDate;
            payment.dateUpdatedBy = auth.user.id;
            payment.dateUpdatedAt = updatedAt;
            await receipt.save({session});
            responseData = {
                success: true,
                unchanged: false,
                paymentId,
                date: payment.date,
                dateUpdatedBy: payment.dateUpdatedBy,
                dateUpdatedAt: payment.dateUpdatedAt,
                dateChangeHistory: payment.dateChangeHistory,
              };
        });
        return NextResponse.json(responseData);
    } catch (error: any) {
        console.log("SUPPLIER PAYMENT DATE UPDATE ERROR: ", error);
        if (error.message === "RECEIPT_NOT_FOUND"){
            return NextResponse.json({error: "Supplier receipt not found"}, {status: 404});
        }
        if (error.message === "PAYMENT_NOT_FOUND") {
            return NextResponse.json({error: "Payment not found"}, {status:404});
        }
        if (
            error.code === 112 ||
            error.hasErrorLabel?.("TransientTransactionError")
          ) {
            return NextResponse.json(
              {
                error:
                  "Receipt was modified. Refresh and retry.",
              },
              { status: 409 }
            );
          }
      
          return NextResponse.json(
            {
              error:
                error.message ||
                "Unable to update supplier payment date",
            },
            { status: 400 }
          );
    } finally {
        await session.endSession();
    }
}