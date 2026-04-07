// /models/PaymentTerm.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IPaymentTerm extends Document { 
    name: string; 
    dueDays?: number; 
    discountDays?: number;
    discountPercentage?: number;
}

const PaymentTermSchema = new Schema<IPaymentTerm>({
  name: { type: String, required: true, unique: true },
  dueDays: { type: Number, default:0 },
  discountDays: {type: Number, default:0},
  discountPercentage: {type:Number, default:0},
}, {timestamps: true});

export default mongoose.models.PaymentTerm || mongoose.model<IPaymentTerm>("PaymentTerm", PaymentTermSchema);
