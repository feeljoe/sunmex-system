import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import Product from "../models/Product";
import Brand from "../models/Brand";
import { connectToDatabase } from "../lib/db";
import ProductInventory from "../models/ProductInventory";
import { join } from "path";
import Type from "../models/Type";

async function importProducts() {
    await connectToDatabase();

    const projectRoot =join(__dirname, "../../");
    const excelPath = join(projectRoot, "src/scripts/Productos.xlsx");
    const workbook = xlsx.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any>(sheet);

    let created = 0;
    
    for (const row of rows) {
        const brand = await Brand.findOne({name: row.brand });
        const type = await Type.findOne({name: row.type});
        if(!brand) {
            console.warn(`Brand not found: ${row.brand}`);
            continue;
        }
        if(!type) {
            console.warn(`Type not found: ${row.type}`);
            continue;
        }

        const product = await Product.findOneAndUpdate(
            {sku: row.sku},
            {
                sku: row.sku,
                upc: row.upc,
                name: row.name,
                brand: brand._id,
                image: "",
                vendorSku: row.vendorSku,
                unitCost: Number(row.unitCost),
                unitPrice: Number(row.unitPrice),
                type: type._id,
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true,
            }
        );

        await ProductInventory.updateOne(
            { product: product._id },
            {
              $setOnInsert: {
                product: product._id,
                currentInventory: Number(row.currentInventory ?? 0),
                preSavedInventory: 0,
                onRouteInventory: 0,
              },
            },
            { upsert: true }
          );
        created ++;
    }
    console.log("Product Import completed");
    console.log(`Products altered: ${created}`);
    process.exit(0);
}

importProducts().catch(err => {
    console.error("Import failed.", err);
    process.exit(1);
});