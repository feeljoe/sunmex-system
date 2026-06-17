import * as dotenv from "dotenv";
dotenv.config();

import * as xlsx from "xlsx";
import { join } from "path";

import { connectToDatabase } from "../lib/db";
import Route from "../models/Route";
import Client from "../models/Client";

async function importRouteClients() {
  await connectToDatabase();

  const projectRoot = join(__dirname, "../../");
  const excelPath = join(projectRoot, "src/scripts/importRouteClients.xlsx");

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Updated interface to match your new Excel column names
  const rows = xlsx.utils.sheet_to_json<{
    code: string | number;
    clientNumber: string | number;
    visitingDay: string;
  }>(sheet);

  let assigned = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.code || !row.clientNumber || !row.visitingDay) {
      console.warn("Skipping row with missing data:", row);
      skipped++;
      continue;
    }

    // Convert to strings and trim to prevent Excel formatting bugs
    const routeCode = String(row.code).trim();
    const clientNum = String(row.clientNumber).trim();
    const day = String(row.visitingDay).trim();

    // 1️⃣ Find route by code
    const route = await (Route as any).findOne({ code: routeCode });
    if (!route) {
      console.warn(`Route not found: ${routeCode}`);
      skipped++;
      continue;
    }

    // 2️⃣ Find the client AND update their visiting days in one operation
    // Note: Using { $set: { visitingDays: [day] } }
    const client = await (Client as any).findOneAndUpdate(
      { clientNumber: clientNum },
      { $set: { visitingDays: [day] } }, 
      { new: true } // Returns the updated document
    );

    if (!client) {
      console.warn(`Client not found: ${clientNum}`);
      skipped++;
      continue;
    }

    // 3️⃣ Add client to route.clients WITHOUT overwriting
    await (Route as any).updateOne(
      { _id: route._id },
      {
        $addToSet: { clients: client._id }, 
      }
    );

    assigned++;
  }

  console.log("Route client import completed");
  console.log(`Clients assigned & updated: ${assigned}`);
  console.log(`Rows skipped: ${skipped}`);

  process.exit(0);
}

importRouteClients().catch(err => {
  console.error("Import failed", err);
  process.exit(1);
});