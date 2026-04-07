// /models/PricingList.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IPricingList extends Document {
  name: string;
  brandIds: mongoose.Types.ObjectId[];
  productIds: mongoose.Types.ObjectId[];
  clientsAssigned: mongoose.Types.ObjectId[];
  chainsAssigned: mongoose.Types.ObjectId[];
  pricing: number;
}

const PricingListSchema = new Schema<IPricingList>({
  name: { type: String },
  brandIds: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
  productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  clientsAssigned: [{ type: Schema.Types.ObjectId, ref: "Client" }],
  chainsAssigned: [{ type: Schema.Types.ObjectId, ref: 'Chain'}],
  pricing: {type: Number},
}, { timestamps: true });

export default mongoose.models.PricingList || mongoose.model<IPricingList>("PricingList", PricingListSchema);
