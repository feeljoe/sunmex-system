// /models/Chain.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IChain extends Document { name: string; }

const ChainSchema = new Schema<IChain>({ name: { type: String, required: true, unique: true }});

export default mongoose.models.Chain || mongoose.model<IChain>("Chain", ChainSchema);