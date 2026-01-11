import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import PaymentTerm from "../models/PaymentTerm";
import { connectToDatabase } from "../lib/db";
import { join } from "path";

async function importBrands() {
    await connectToDatabase();

    const projectRoot =join(__dirname, "../../");
    const excelPath = join(projectRoot, "src/scripts/PaymentTerms.xlsx");
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any>(sheet);

    let created = 0;
    let skipped = 0;
    
    for (const row of rows) {
        if(!row.name) {
            console.warn(`Skipping without name`);
            skipped ++;
            continue;
        }
        const exists = await PaymentTerm.findOne({name: row.name.trim()});
        if(exists){
            console.log(`Payment Term already exists: ${row.name}`);
            skipped ++;
            continue;
        }
        await PaymentTerm.create({
            name: row.name.trim(),
            dueDays: Number(row.dueDays),
            discountDays: Number(row.discountDays),
            discountPercentage: Number(row.discountPercentage),
        });
        created ++;
    }
    console.log("Payment Term Import completed");
    console.log(`Created ${created} new payment terms`)
    console.log(`Payment terms skipped: ${skipped}`);
    process.exit(0);
}

importBrands().catch(err => {
    console.error("Import failed", err);
    process.exit(1);
});