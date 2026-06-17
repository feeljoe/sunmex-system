import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import ProductInventory from "@/models/ProductInventory";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });


async function hotfixInventory() {
  try {
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

    console.log("Applying +200 hotfix to onRouteInventory and inactiveInventory for ALL products...");

    // The empty object {} as the first argument targets EVERY document in the collection
    const result = await ProductInventory.updateMany(
      {}, 
      {
        $inc: {
          onRouteInventory: 200,
          inactiveInventory: 200,
        },
      }
    );

    console.log("Hotfix applied successfully!");
    console.log(`Inventory documents updated: ${result.modifiedCount}`);

  } catch (err: any) {
    console.error("\n❌ ERROR:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected. Exiting Script...");
    process.exit(0);
  }
}

hotfixInventory();