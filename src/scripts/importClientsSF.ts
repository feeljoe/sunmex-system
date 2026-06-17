import mongoose from "mongoose";
import * as xlsx from "xlsx";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import Client from "@/models/Client";
import Chain from "@/models/Chain";
import PaymentTerm from "@/models/PaymentTerm";

async function runImport(filePath: string) {
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

        let net30Term = await PaymentTerm.findOne({ name: "Net 30"});
        if(!net30Term) {
            net30Term = await PaymentTerm.create({ name: "Net 30", dueDays: 30 });
            console.log("Created missing 'NET 30' PaymentTerm.");
        }

        let albertsons = await Chain.findOne({ name: "Albertsons" });
        if (!albertsons) await Chain.create({ name: "Albertsons" });

        let safeway = await Chain.findOne({ name: "SAFEWAY" });
        if (!safeway) await Chain.create({ name: "SAFEWAY" });

        console.log(`Reading Excel file at: ${filePath}`);

        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const clientsToInsert = [];
        let clientNumber = 11947;
        for (const row of rawData as any[]) {
            const clientName = row["Name"] ? String(row["Name"]).trim() : "";
            let chainId = undefined;
            const lowerCaseName = clientName.toLowerCase();
            if( lowerCaseName.startsWith("albertsons")) {
                chainId = albertsons._id;
            } else if (lowerCaseName.startsWith("safeway")) {
                chainId = safeway._id;
            }
            
            const newClient = {
                clientNumber: clientNumber,
                clientName: clientName,
                chain: chainId,
                billingAddress: {
                    addressLine: row["Address"],
                    city: row["City"],
                    state: row["State"],
                    zipCode: row["Zip"],
                },
                paymentTerm: net30Term._id,
                creditLimit: 0,
                frequency: "weekly",
                visitingDays: [],
            };
            clientsToInsert.push(newClient);
            clientNumber++;
        }

        if (clientsToInsert.length > 0) {
            const result = await Client.insertMany(clientsToInsert);
            console.log(`Successfully imported ${result.length} clients!`);
        } else {
            console.log("No valid rows found in the excel file.");
        }
    } catch (err: any) {
        console.error("Error during import: ", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
}

runImport('/Users/joelvalenzuela/Downloads/SunmexStoresContactList.xlsx');