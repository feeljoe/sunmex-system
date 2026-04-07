// /models/Supplier.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISupplier extends Document {
  name: string;
  contact?: string;
  email?: string;
  phoneNumber?: string;
  billingAddress?: {
    addressLine?: string; city?: string; state?: string; country?: string; zipCode?: string;
  };
}

const AddressSchema = new Schema({
  addressLine: String, city: String, state: String, country: String, zipCode: String
}, { _id: false });

const SupplierSchema = new Schema<ISupplier>({
  name: { type: String, required: true },
  contact: String,
  email: String,
  phoneNumber: String,
  billingAddress: AddressSchema
}, { timestamps: true });

export default mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema);
