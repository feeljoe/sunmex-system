// /models/SchedulePricingList.ts
import mongoose, { Schema, Document } from "mongoose";

const PricingEntrySchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: "Product" },
  brandId: { type: Schema.Types.ObjectId, ref: "Brand" },
  price: Number
}, { _id: false });

export interface IPricingList extends Document {
  name: string;
  brandIds: mongoose.Types.ObjectId[];
  productIds: mongoose.Types.ObjectId[];
  clientsAssigned: mongoose.Types.ObjectId[];
  pricing: Array<{ productId?: mongoose.Types.ObjectId; brandId?: mongoose.Types.ObjectId; price: number }>;
  startDate: Date;
  endDate: Date;
}

const ScheduledPricingListSchema = new Schema<IPricingList>({
  name: { type: String },
  brandIds: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
  productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  clientsAssigned: [{ type: Schema.Types.ObjectId, ref: "Client" }],
  pricing: [PricingEntrySchema],
  startDate: Date,
  endDate: Date
}, { timestamps: true });

export default mongoose.models.SchedulePricingList || mongoose.model("SchedulePricingList", ScheduledPricingListSchema);
