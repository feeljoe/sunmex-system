import mongoose from "mongoose";
import PreOrder from "@/models/PreOrder";
import dotenv from "dotenv";
import path from "path";
import { DateTime } from "luxon";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function migratePaymentProcessed(){
    try{
        // 1. Grab the variable, strip quotes, and TRIM invisible spaces/newlines
        const rawUri = process.env.MONGODB_URI;
        const match = rawUri?.match(/(mongodb(?:\+srv)?:\/\/.+)/);
        const mongoUri = match ? match[0] : null;

        const phoenixNow = DateTime.now().setZone("America/Phoenix");
        const startOfWeek = phoenixNow.startOf("week").toUTC().toJSDate();
        const endOfWeek = phoenixNow.endOf("week").toUTC().toJSDate();

        // 2. Print the exact string with brackets so we can see hidden characters
        console.log("EXACT URI SEEN BY SCRIPT:", `[${mongoUri}]`);
        if(!mongoUri){
            throw new Error("MONGODB_URI is not defined in your environment variables");
        }
        console.log("Connecting to database...");
        await mongoose.connect(mongoUri);
        console.log("Database connected successfully");

        console.log("Finding Preorders missing the Warehouse Return Processed field... ");

        const result = await PreOrder.updateMany(
            { deliveredAt: { $gte: startOfWeek, $lte: endOfWeek } },
            { $set: { warehouseReturnProcessed: false } }
        );
        console.log(" Migration completed successfully!");
        console.log(`Preorders updated: ${result.modifiedCount}`);
    }catch (err: any) {
        console.error("\n Error: ", err.message);
    }finally {
        await mongoose.disconnect();
        console.log("Database disconnected, exiting script ...");
        process.exit(0);
    }
}

migratePaymentProcessed();