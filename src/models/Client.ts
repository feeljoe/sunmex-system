// /models/Client.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAddress {
  addressLine?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
}

export interface IClient extends Document {
  clientNumber: string;
  clientName: string;
  chain?: Types.ObjectId;
  contactName?: string;
  phoneNumber?: string;
  billingAddress?: IAddress;
  paymentTerm?: Types.ObjectId;
  creditLimit?: number;
  frequency?: string;
  visitingDays?:string[];
}

const AddressSchema = new Schema({
  addressLine: String,
  city: String,
  state: String,
  country: String,
  zipCode: String
}, { _id: false });

const ClientSchema = new Schema<IClient>({
  clientNumber: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  chain: { type: Schema.Types.ObjectId, ref: "Chain" },
  contactName: String,
  phoneNumber: String,
  billingAddress: AddressSchema,
  paymentTerm: { type: Schema.Types.ObjectId, ref: "PaymentTerm" },
  creditLimit: Number,
  frequency: {type: String, required: true},
  visitingDays: {
    type: [String], // 👈 THIS IS THE FIX
    required: true,
  },
}, { timestamps: true });

export default mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
