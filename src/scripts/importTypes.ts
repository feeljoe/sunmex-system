import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import Type from "../models/Type";
import { connectToDatabase } from "../lib/db";
import { join } from "path";

async function importBrands() {
    await connectToDatabase();

    const projectRoot =join(__dirname, "../../");
    const excelPath = join(projectRoot, "src/scripts/Tipos.xlsx");
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<{name: string}>(sheet);

    let created = 0;
    let skipped = 0;
    
    for (const row of rows) {
        if(!row.name) {
            console.warn(`Skipping without name`);
            skipped ++;
            continue;
        }
        const exists = await Type.findOne({name: row.name.trim()});
        if(exists){
            console.log(`Line already exists: ${row.name}`);
            skipped ++;
            continue;
        }
        await Type.create({
            name: row.name.trim(),
        });
        created ++;
    }
    console.log("Type Import completed");
    console.log(`Created ${created} new types`)
    console.log(`Type skipped: ${skipped}`);
    process.exit(0);
}

importBrands().catch(err => {
    console.error("Import failed", err);
    process.exit(1);
});