import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import Chain from "../models/Chain";
import { connectToDatabase } from "../lib/db";
import { join } from "path";

async function importBrands() {
    await connectToDatabase();

    const projectRoot =join(__dirname, "../../");
    const excelPath = join(projectRoot, "src/scripts/Cadenas.xlsx");
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
        const exists = await Chain.findOne({name: row.name.trim()});
        if(exists){
            console.log(`Chain already exists: ${row.name}`);
            skipped ++;
            continue;
        }
        await Chain.create({
            name: row.name.trim(),
        });
        created ++;
    }
    console.log("Chain Import completed");
    console.log(`Created ${created} new chains`)
    console.log(`chains skipped: ${skipped}`);
    process.exit(0);
}

importBrands().catch(err => {
    console.error("Import failed", err);
    process.exit(1);
});