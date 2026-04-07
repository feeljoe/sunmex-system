import mongoose from "mongoose";
import { create } from "xmlbuilder2";
import Preorder from "../../models/PreOrder";
import Client from "../../models/Client";
import ProductInventory from "../../models/ProductInventory";

// ==========================
// CONFIG
// ==========================
const QB_GENERIC_ITEM_NAME = "NonInventory Sale"; // Must exist in QuickBooks
const QB_DEPOSIT_ACCOUNT = "Checking"; // QB account where payments go

// ==========================
// UTILS
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
            .ele("TxnDate").txt(preorder.deliveryDate.toISOString().split("T")[0]).up();

  // Add lines
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
// MAIN FUNCTION
// ==========================
export async function pushPreorderToQB(preorderId: string) {
  await mongoose.connect(process.env.MONGO_URI!);

  // Load preorder with client and product info
  const preorder = await Preorder.findById(preorderId)
    .populate("client")
    .populate("products.productInventory");

  if (!preorder) throw new Error("Preorder not found");
  const client = preorder.client;

  // ------------------
  // 1️⃣ Customer
  // ------------------
  // Normally here you would query QuickBooks to see if the customer exists.
  // For demo, let's assume you need to add the customer:
  const customerXML = buildCustomerAddXML(client);
  console.log("CUSTOMER ADD XML:\n", customerXML);

  // ------------------
  // 2️⃣ Invoice
  // ------------------
  const invoiceXML = buildInvoiceAddXML(preorder, "12345"); // Replace 12345 with real ListID from QB
  console.log("INVOICE ADD XML:\n", invoiceXML);

  // ------------------
  // 3️⃣ Payment
  // ------------------
  const paymentXML = buildReceivePaymentXML(preorder, "12345", "67890"); // Replace with real ListID & TxnID
  console.log("PAYMENT XML:\n", paymentXML);

  mongoose.disconnect();
}
