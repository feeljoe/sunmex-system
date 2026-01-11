// /models/Product.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProduct extends Document {
  image?: string,
  sku: string;
  vendorSku?: string;
  upc?: string;
  brand: Types.ObjectId;
  name: string;
  productType?: Types.ObjectId;
  productFamily?: Types.ObjectId;
  productLine?: Types.ObjectId;
  unitCost?: number;
  unitPrice?: number;
  caseSize?: number;
  layerSize?: number;
  palletSize?: number;
  weight?: number;
  unit?: "g" | "kg" | "mg" | "oz" | "lb" | "fl oz" | "ml" | "l";
}

const ProductSchema = new Schema<IProduct>({
  image: {type: String},
  sku: { type: String, required: true, unique: true },
  vendorSku: {type: String},
  upc: { type: String, required: true, unique: true },
  brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
  name: { type: String, required: true },
  productType: {type: Schema.Types.ObjectId, ref: "Type"},
  productFamily: {type: Schema.Types.ObjectId, ref: "Family"},
  productLine: {type: Schema.Types.ObjectId, ref: "Line"},
  unitCost: {type: Number},
  unitPrice: {type: Number},
  caseSize: {type: Number},
  layerSize: {type: Number},
  palletSize: {type: Number},
  weight: {type: Number},
  unit: {type: String, 
    enum: ["g" , "kg" , "mg" , "oz" , "lb" , "fl oz" , "ml" , "l"]
  },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);
