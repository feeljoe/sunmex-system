import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import Brand from "../models/Brand";
import { connectToDatabase } from "../lib/db";
import { join } from "path";

async function importBrands() {
    await connectToDatabase();

    const projectRoot =join(__dirname, "../../");
    const excelPath = join(projectRoot, "src/scripts/Inventarios.xlsx");
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any>(sheet);

    let created = 0;
    let skipped = 0;
    
    for (const row of rows) {
        if(!row.brand) {
            console.warn(`Skipping without name`);
            skipped ++;
            continue;
        }
        const exists = await Brand.findOne({name: row.brand.trim()});
        if(exists){
            console.log(`Brand already exists: ${row.brand}`);
            skipped ++;
            continue;
        }
        await Brand.create({
            name: row.brand.trim(),
        });
        created ++;
    }
    console.log("Brand Import completed");
    console.log(`Created ${created} new brands`)
    console.log(`brands skipped: ${skipped}`);
    process.exit(0);
}

importBrands().catch(err => {
    console.error("Import failed", err);
    process.exit(1);
});