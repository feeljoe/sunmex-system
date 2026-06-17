import mongoose from "mongoose";
import DirectSale from "@/models/DirectSale";
import Product from "@/models/Product";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const toCents = (value: number) => Math.round(value * 100);
const fromCents = (cents: number) => Number((cents / 100).toFixed(2));

async function migratePreorderCogs() {
    try {
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

        await Product.init();
        
        console.log("Fetching all delivered Preorders...");

        const preorders = await DirectSale.find({status: "delivered"})
        .populate({
            path: "products.product",
        })
        .lean();

        console.log(`Found ${preorders.length} preorders. Calculating COGS...`);
        const bulkOps = [];
        let updatedCount = 0;
        let skippedCount = 0;

        for (const po of preorders) {
            if(po.cogs && po.cogs > 0) {
                skippedCount ++;
                continue;
            }
            let orderCogsCents = 0;

            for (const p of po.products) {
                const unitCost = p.product?.unitCost || 0;
                const deliveredQty = Number(p.quantity || 0);

                orderCogsCents += toCents(deliveredQty * unitCost);
            }

            const finalCogs = fromCents(orderCogsCents);

            bulkOps.push({
                updateOne: {
                    filter: {_id: po._id},
                    update: {$set: {cogs: finalCogs}},
                },
            });
            updatedCount++;
        }

        if(bulkOps.length > 0) {
            console.log(`Executing bulk update for ${bulkOps.length} preorders...`);
            const result = await DirectSale.bulkWrite(bulkOps);
            console.log("Migration completed successfully");
            console.log(`Preorders updated with cogs: ${result.modifiedCount}`);
        }else {
            console.log("No preorders need updating.");
        }

        console.log(`Preorders skipped (Already had COGS): ${skippedCount}`);
    } catch(err: any) {
        console.error("\n Error: ", err.message);
    } finally {
        await mongoose.disconnect();

        console.log("Database disconected. Exiting script...");
        process.exit(0);
    }
}

migratePreorderCogs();