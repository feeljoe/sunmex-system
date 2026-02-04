// models/CreditMemo.ts
import { Schema, model, models } from "mongoose";

const CreditMemoSchema = new Schema(
  {
    number: {type: String, required: true, unique: true},
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, required: true },
        pickedQuantity: {type: Number, default: 0},
        returnedQuantity: {type: Number},
        actualCost: { type: Number, default: 0 }, // optional if cost changes
        returnReason: {
          type: String,
          enum: ["credit memo", "good return"],
        }
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subtotal: {type: Number, default: 0},
    total: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "received", "cancelled"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    routeAssigned: {type: Schema.Types.ObjectId, ref:"Route"},
    returnedAt: {type: Date},
    returnSignature: {
      type: String,
    },
    cancelledAt: {type: Date},
    cancelledBy: {type: Schema.Types.ObjectId, ref: "User"},
    cancelReason:{type: String},
  },
  { versionKey: false }
);

export default models.CreditMemo || model("CreditMemo", CreditMemoSchema);