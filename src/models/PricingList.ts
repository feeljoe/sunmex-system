// /models/PricingList.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IPricingList extends Document {
  name: string;
  brandIds: mongoose.Types.ObjectId[];
  productIds: mongoose.Types.ObjectId[];

  productPrices: {product: mongoose.Types.ObjectId; price: number}[];
  brandPrices: {brand: mongoose.Types.ObjectId; price: number}[];
  clientPrices: { client: mongoose.Types.ObjectId; price: number }[];
  chainPrices: { chain: mongoose.Types.ObjectId; price: number }[];
  clientsAssigned: mongoose.Types.ObjectId[];
  chainsAssigned: mongoose.Types.ObjectId[];
  pricing: number;
}

const PricingListSchema = new Schema<IPricingList>({
  name: { type: String },
  brandIds: [{ type: Schema.Types.ObjectId, ref: "Brand" }],
  productIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  //Specific price mappings
  productPrices: [{
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    price: { type: Number }
  }],
  brandPrices: [{
    brand: { type: Schema.Types.ObjectId, ref: "Brand" },
    price: { type: Number }
  }],
  clientsAssigned: [{ type: Schema.Types.ObjectId, ref: "Client" }],
  chainsAssigned: [{ type: Schema.Types.ObjectId, ref: 'Chain'}],
  clientPrices: [{
    client: { type: Schema.Types.ObjectId, ref: "Client" },
    price: { type: Number }
  }],
  chainPrices: [{
    chain: { type: Schema.Types.ObjectId, ref: "Chain" },
    price: { type: Number }
  }],
  pricing: {type: Number},
}, { timestamps: true });

export default mongoose.models.PricingList || mongoose.model<IPricingList>("PricingList", PricingListSchema);
