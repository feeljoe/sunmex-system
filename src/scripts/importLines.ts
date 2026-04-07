import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import Line from "../models/Line";
import { connectToDatabase } from "../lib/db";
import { join } from "path";

async function importBrands() {
    await connectToDatabase();

    const projectRoot =join(__dirname, "../../");
    const excelPath = join(projectRoot, "src/scripts/Lineas.xlsx");
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
        const exists = await Line.findOne({name: row.name.trim()});
        if(exists){
            console.log(`Line already exists: ${row.name}`);
            skipped ++;
            continue;
        }
        await Line.create({
            name: row.name.trim(),
        });
        created ++;
    }
    console.log("Line Import completed");
    console.log(`Created ${created} new lines`)
    console.log(`Lines skipped: ${skipped}`);
    process.exit(0);
}

importBrands().catch(err => {
    console.error("Import failed", err);
    process.exit(1);
});