import mongoose from "mongoose";
import { create } from "xmlbuilder2";
import { XMLParser } from "fast-xml-parser";
import Preorder from "../../models/PreOrder";

// ==========================
// CONFIG
// ==========================
const QB_GENERIC_ITEM_NAME = "NonInventory Sale"; // Must exist in QB
const QB_DEPOSIT_ACCOUNT = "Checking"; // QB account where payments go
const QBWC_ENDPOINT = process.env.QBWC_ENDPOINT; // your QBWC service URL
const QBWC_USERNAME = process.env.QBWC_USERNAME;
const QBWC_PASSWORD = process.env.QBWC_PASSWORD;

// ==========================
// XML Builders
// ==========================
function buildCustomerAddXML(client: any) {
  return create({ version: "1.0", encoding: "UTF-8" })
    .ele("QBXML")
      .ele("QBXMLMsgsRq", { onError: "stopOnError" })
        .ele("CustomerAddRq")
          .ele("CustomerAdd")
            .ele("Name").txt(client.clientName).up()
            .ele("CompanyName").txt(client.clientName).up()
            .ele("Phone").txt(client.phoneNumber || "").up()
            .ele("BillAddress")
              .ele("Addr1").txt(client.billingAddress?.addressLine || "").up()
              .ele("City").txt(client.billingAddress?.city || "").up()
              .ele("State").txt(client.billingAddress?.state || "").up()
              .ele("PostalCode").txt(client.billingAddress?.zipCode || "").up()
              .ele("Country").txt(client.billingAddress?.country || "").up()
            .up()
          .up()
        .up()
      .up()
    .up()
    .end({ prettyPrint: true });
}

function buildInvoiceAddXML(preorder: any, clientListID: string) {
  const doc = create({ version: "1.0", encoding: "UTF-8" })
    .ele("QBXML")
      .ele("QBXMLMsgsRq", { onError: "stopOnError" })
        .ele("InvoiceAddRq")
          .ele("InvoiceAdd")
            .ele("CustomerRef")
              .ele("ListID").txt(clientListID).up()
            .up()
            .ele("RefNumber").txt(preorder.number).up()
            .ele("TxnDate").txt(preorder.deliveryDate?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0]).up();

  preorder.products.forEach((line: any) => {
    doc
      .ele("InvoiceLineAdd")
        .ele("ItemRef")
          .ele("FullName").txt(QB_GENERIC_ITEM_NAME).up()
        .up()
        .ele("Desc").txt(line.productInventory.name).up()
        .ele("Quantity").txt(line.quantity.toString()).up()
        .ele("Rate").txt(line.actualCost.toFixed(2)).up()
      .up();
  });

  return doc.end({ prettyPrint: true });
}

function buildReceivePaymentXML(preorder: any, clientListID: string, invoiceTxnID: string) {
  return create({ version: "1.0", encoding: "UTF-8" })
    .ele("QBXML")
      .ele("QBXMLMsgsRq", { onError: "stopOnError" })
        .ele("ReceivePaymentAddRq")
          .ele("ReceivePaymentAdd")
            .ele("CustomerRef")
              .ele("ListID").txt(clientListID).up()
            .up()
            .ele("TxnDate").txt(preorder.deliveredAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0]).up()
            .ele("TotalAmount").txt(preorder.total.toFixed(2)).up()
            .ele("DepositToAccountRef")
              .ele("FullName").txt(QB_DEPOSIT_ACCOUNT).up()
            .up()
            .ele("AppliedToTxnAdd")
              .ele("TxnID").txt(invoiceTxnID).up()
              .ele("PaymentAmount").txt(preorder.total.toFixed(2)).up()
            .up()
          .up()
        .up()
      .up()
    .up()
    .end({ prettyPrint: true });
}

// ==========================
// MOCK QBWC REQUEST
// ==========================
async function sendToQBWC(xml: string) {
  console.log("Sending XML to QBWC:\n", xml);
  // Replace this with actual QBWC SOAP request if needed
  // For now return mock response:
  return {
    ListID: "MOCK-LISTID-123",
    TxnID: "MOCK-TXNID-456"
  };
}

// ==========================
// MAIN FUNCTION
// ==========================
export async function pushPreorderToQB(preorderId: string) {
  await mongoose.connect(process.env.MONGO_URI!);

  const preorder = await Preorder.findById(preorderId)
    .populate("client")
    .populate("products.productInventory");

  if (!preorder) throw new Error("Preorder not found");

  const client = preorder.client;

  // 1️⃣ Customer
  const customerXML = buildCustomerAddXML(client);
  const customerResp = await sendToQBWC(customerXML); // returns { ListID }
  const clientListID = customerResp.ListID;

  // 2️⃣ Invoice
  const invoiceXML = buildInvoiceAddXML(preorder, clientListID);
  const invoiceResp = await sendToQBWC(invoiceXML); // returns { TxnID }
  const invoiceTxnID = invoiceResp.TxnID;

  // 3️⃣ Payment
  if (preorder.paymentStatus === "paid") {
    const paymentXML = buildReceivePaymentXML(preorder, clientListID, invoiceTxnID);
    await sendToQBWC(paymentXML);
  }

  // 4️⃣ Update MongoDB
  preorder.quickbooks = {
    synced: true,
    qbTxnId: invoiceTxnID,
    syncedAt: new Date(),
  };
  await preorder.save();

  console.log("✅ Preorder synced to QuickBooks");
  mongoose.disconnect();
}
