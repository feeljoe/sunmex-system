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
  const excelPath = join(projectRoot, "src/scripts/RoutesClients.xlsx");

  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<{
    route: string;
    clientNumber: string;
  }>(sheet);

  let assigned = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.route || !row.clientNumber) {
      console.warn("Skipping row with missing data:", row);
      skipped++;
      continue;
    }

    // 1️⃣ Find route by code
    const route = await Route.findOne({ code: row.route });
    if (!route) {
      console.warn(`Route not found: ${row.route}`);
      skipped++;
      continue;
    }

    // 2️⃣ Find client by clientNumber
    const client = await Client.findOne({ clientNumber: row.clientNumber });
    if (!client) {
      console.warn(`Client not found: ${row.clientNumber}`);
      skipped++;
      continue;
    }

    // 3️⃣ Add client to route.clients WITHOUT overwriting
    await Route.updateOne(
      { _id: route._id },
      {
        $addToSet: { clients: client._id }, // 👈 magic
      }
    );

    assigned++;
  }

  console.log("Route client import completed");
  console.log(`Clients assigned: ${assigned}`);
  console.log(`Rows skipped: ${skipped}`);

  process.exit(0);
}

importRouteClients().catch(err => {
  console.error("Import failed", err);
  process.exit(1);
});
