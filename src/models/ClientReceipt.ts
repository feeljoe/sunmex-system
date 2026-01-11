// /models/ClientReceipt.ts
import mongoose, { Schema, Document } from "mongoose";

const ClientReceiptProductSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: Number
}, { _id: false });

export interface IClientReceipt extends Document {
  invoiceNumber: string;
  date: Date;
  user: mongoose.Types.ObjectId;
  client: mongoose.Types.ObjectId;
  products: Array<{ productId: mongoose.Types.ObjectId; quantity: number }>;
  total: number;
  status: string; // 'pending'|'paid'
}

const ClientReceiptSchema = new Schema<IClientReceipt>({
  invoiceNumber: { type: String, required: true },
  date: Date,
  user: { type: Schema.Types.ObjectId, ref: "User" },
  client: { type: Schema.Types.ObjectId, ref: "Client" },
  products: [ClientReceiptProductSchema],
  total: Number,
  status: { type: String, default: "pending" }
}, { timestamps: true });

export default mongoose.models.ClientReceipt || mongoose.model<IClientReceipt>("ClientReceipt", ClientReceiptSchema);
