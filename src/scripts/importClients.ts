import * as dotenv from "dotenv";
dotenv.config();
import * as xlsx from "xlsx";
import Client from "../models/Client";
import Chain from "../models/Chain";
import PaymentTerm from "../models/PaymentTerm";
import { connectToDatabase } from "../lib/db";
import { join } from "path";

async function importClients() {
  await connectToDatabase();

  const projectRoot = join(__dirname, "../../");
  const excelPath = join(projectRoot, "src/scripts/Cliente.xlsx");
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json<any>(sheet);

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.clientNumber || !row.clientName || !row.frequency) {
      console.warn(`Skipping row, missing required fields: ${JSON.stringify(row)}`);
      skipped++;
      continue;
    }

    // Look up related objects
    const chain = row.chain ? await Chain.findOne({ name: row.chain }) : null;
    const paymentTerm = row.paymentTerm ? await PaymentTerm.findOne({ name: row.paymentTerm }) : null;

    // Parse billing address
    const billingAddress = row.billingAddress
      ? (() => {
          const parts = row.billingAddress.split(",").map((s: string) => s.trim());
          return {
            addressLine: parts[0] || "",
            city: parts[1] || "",
            state: parts[2] || "",
            country: parts[3] || "",
            zipCode: parts[4] || "",
          };
        })()
      : undefined;

    // Parse visiting days (comma separated, optional)
    const visitingDays = row.visitingDays
      ? row.visitingDays.split(",").map((s: string) => s.trim())
      : [];

    await Client.updateOne(
      { clientNumber: row.clientNumber },
      {
        clientNumber: row.clientNumber,
        clientName: row.clientName,
        chain: chain?._id,
        contactName: row.contactName || null,
        phoneNumber: row.phoneNumber || null,
        billingAddress,
        paymentTerm: paymentTerm?._id,
        creditLimit: row.creditLimit ? Number(row.creditLimit) : 0,
        frequency: row.frequency,
        visitingDays,
      },
      { upsert: true }
    );

    created++;
  }

  console.log("Client import completed");
  console.log(`Clients created/updated: ${created}`);
  console.log(`Rows skipped: ${skipped}`);
  process.exit(0);
}

importClients().catch(err => {
  console.error("Import failed.", err);
  process.exit(1);
});
