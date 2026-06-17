import mongoose from "mongoose";
import CreditMemo from "@/models/CreditMemo";
import PreOrder from "@/models/PreOrder";
import DirectSale from "@/models/DirectSale";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function syncPaymentProcessed(){
    try{
        // 1. Grab the variable, strip quotes, and TRIM invisible spaces/newlines
        const rawUri = process.env.MONGODB_URI;
        const match = rawUri?.match(/(mongodb(?:\+srv)?:\/\/.+)/);
        const mongoUri = match ? match[0] : null;

        // 2. Print the exact string with brackets so we can see hidden characters
        console.log("EXACT URI SEEN BY SCRIPT:", `[${mongoUri}]`);
        if(!mongoUri){
            throw new Error("MONGODB_URI is not defined in your environment variables");
        }
        console.log("Connecting to database...");
        await mongoose.connect(mongoUri);
        console.log("Database connected successfully");

        console.log("Fetching paid Orders and Direct Sales...");

        const paidOrders = await PreOrder.find({ paymentStatus: "paid" }).select("_id").lean();
        const paidDirectSales = await DirectSale.find({ paymentStatus: "paid" }).select("_id").lean();

        const paidOrderIds = new Set(paidOrders.map(o => o._id.toString()));
        const paidDirectSaleIds = new Set(paidDirectSales.map(ds => ds._id.toString()));
        
        console.log(` Found ${paidOrderIds.size} Paid Orders and ${paidDirectSaleIds.size} Paid Direct Sales.`);
        console.log("Analizing Credit Memos... ");

        const creditMemos = await CreditMemo.find({}).select("preorder directSale paymentProcessed").lean();
        const bulkOps = [];

        let markedPaid = 0;
        let markedPending = 0;

        for (const cm of creditMemos) {
            let shouldBeProcessed = false;

            if(cm.preorder && paidOrderIds.has(cm.preorder.toString())){
                shouldBeProcessed = true;
            } else if (cm.directSale && paidDirectSaleIds.has(cm.directSale.toString())){
                shouldBeProcessed = true;
            }
            
            bulkOps.push({
                updateOne: {
                    filter: { _id: cm._id },
                    update: { $set: { paymentProcessed: shouldBeProcessed } }
                }
            });
            
            if (shouldBeProcessed) markedPaid ++;
            else markedPending ++;
        }

        console.log(`Executing bulk update for ${bulkOps.length} Credit Memos... `);

        if(bulkOps.length > 0) {
            const result = await CreditMemo.bulkWrite(bulkOps);
            console.log("Sync completed Successfully");
            console.log(`Set to true Paid: ${markedPaid}`);
            console.log(`Set to false Pending: ${markedPending}`);
        }else {
            console.log("No Credit Memos found to update");
        }
    } catch (err: any) {
        console.error("\n Error: ", err.message);
    } finally {
        await mongoose.disconnect();
        console.log(" Database Disconnected. Exiting Script... ");
        process.exit(0);
    }
}

syncPaymentProcessed();