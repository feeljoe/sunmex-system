import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db"; 
import CreditMemo from "@/models/CreditMemo";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function fixMissingReturnReasons() {
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

    console.log("Searching for Credit Memos with missing or invalid return reasons...");

    // This query looks inside the 'products' array.
    // If it finds a product where the reason is NOT 'good return' or 'credit memo' 
    // (meaning it's null, undefined, or empty), it sets it to 'credit memo'.
    const result = await CreditMemo.updateMany(
      {
        "products": {
          $elemMatch: {
            returnReason: { $nin: ["good return", "credit memo"] }
          }
        }
      },
      {
        // Update the specific matched array element
        $set: { "products.$[elem].returnReason": "credit memo" }
      },
      {
        // Tell MongoDB exactly which element in the array 'elem' refers to
        arrayFilters: [
          { "elem.returnReason": { $nin: ["good return", "credit memo"] } }
        ]
      }
    );

    console.log("Cleanup completed successfully!");
    console.log(`Credit Memo documents updated: ${result.modifiedCount}`);

  } catch (err: any) {
    console.error("\n❌ ERROR:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected. Exiting Script...");
    process.exit(0);
  }
}

fixMissingReturnReasons();