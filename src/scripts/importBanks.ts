import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import Bank from "../models/Bank";
import { connectToDatabase } from "../lib/db";
import { join } from "path";

async function importBrands() {
    await connectToDatabase();

    const projectRoot =join(__dirname, "../../");
    const excelPath = join(projectRoot, "src/scripts/Bancos.xlsx");
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
        const exists = await Bank.findOne({name: row.accountNumber});
        if(exists){
            console.log(`Bank account already exists: ${row.accountNumber}`);
            skipped ++;
            continue;
        }
        await Bank.create({
            name: row.name.trim(),
            accountNumber: row.accountNumber,
        });
        created ++;
    }
    console.log("Bank accounts Import completed");
    console.log(`Imported ${created} new bank accounts`)
    console.log(`Bank accounts skipped: ${skipped}`);
    process.exit(0);
}

importBrands().catch(err => {
    console.error("Import failed", err);
    process.exit(1);
});