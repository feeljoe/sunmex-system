import mongoose from "mongoose";
import * as xlsx from "xlsx";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import Product from "@/models/Product";
import Type from "@/models/Type";

async function importTypesFromExcel(filePath: string) {
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
        console.log(`Reading Excel file at: ${filePath}`);
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = xlsx.utils.sheet_to_json(sheet) as { SKU: string; Type: string} [];

        if(rows.length === 0){
            throw new Error("The Excel file is empty or formatted incorrectly.");
        }
        console.log(`Found ${rows.length} rows in the Excel file. Fetching Types from database...`);
        const allTypes = await Type.find({}).lean();
        const typeMap = new Map<string, string>();

        allTypes.forEach((t: any) => {
            if(t.name){
                typeMap.set(t.name.toLowerCase().trim(), t._id.toString());
            }
        });
        console.log(`Loaded ${allTypes.length} types from the database. Preparing bulk update...`);
        const bulkOps = [];
        let notFoundTypes = new Set<string>();

        for(const row of rows) {
            const sku = row.SKU ? String(row.SKU).trim(): null;
            const typeName = row.Type ? String(row.Type).trim().toLowerCase(): null;

            if(!sku || !typeName) continue;

            const typeId = typeMap.get(typeName);

            if(typeId){
                bulkOps.push({
                    updateOne: {
                        filter: { sku: sku },
                        update: { $set: { productType: typeId }},
                    },
                });
            } else {
                notFoundTypes.add(row.Type);
            }
        }
        if(bulkOps.length > 0) {
            console.log(`Executing bulk update for ${bulkOps.length} products...`);
            const result = await Product.bulkWrite(bulkOps);
            console.log("Import completed successfully!");
            console.log(`Products Updated: ${result.modifiedCount}`);
        }else {
            console.log("No matching products / types found to update");
        }
        if (notFoundTypes.size > 0) {
            console.log("\n⚠️ WARNING: The following Types were in the Excel file but NOT found in the database:");
            console.log(Array.from(notFoundTypes).join(", "));
          }
    } catch(err: any) {
        console.error("\n ERROR: ", err.message);
    }finally {
        await mongoose.disconnect();
        console.log("Database disconnected. Exiting Script...");
        process.exit(0);
    }
}

const filePathArg = process.argv[2];

if(!filePathArg) {
    console.error("Please provide the path to the Excel file.");
    console.log("Usage: npx tsx scripts/importTypes.ts <path-to-file.xlsx>");
    process.exit(1);
}

importTypesFromExcel(filePathArg);