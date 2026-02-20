// models/Preorder.ts
import mongoose, { Schema, model, models } from "mongoose";

const PreorderSchema = new Schema(
  {
    number: {type: String, required: true, unique: true},
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    products: [
      {
        productInventory: { type: Schema.Types.ObjectId, ref: "ProductInventory", required: true },
        quantity: { type: Number, required: true },
        pickedQuantity: {type: Number, default: 0},
        differenceReason: {type: String, enum: ["productDamaged", "productExpired", "productNotAvailable"]},
        authorizedBy: {type: Schema.Types.ObjectId, ref: "User"},
        deliveredQuantity: {type: Number},
        actualCost: { type: Number, default: 0 }, // optional if cost changes
        deviationReason: {
          type: String,
          enum: ["damaged", "missing", "returned"],
        }
      },
    ],
    type: {type: String, enum: ["charge", "noCharge"], default: "charge"},
    noChargeReason: {type: String},
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subtotal: {type: Number, default: 0},
    total: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "assigned", "ready", "delivered", "cancelled"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    routeAssigned: {type: Schema.Types.ObjectId, ref:"Route"},
    assembledBy: {type: Schema.Types.ObjectId, ref: "User"},
    assembledAt: {type: Date},
    deliveryDate: {
      type: Date,
      index: true,
    },
    deliveredAt: {type: Date},
    deliverySignature: {
      type: String,
    },
    cancelledAt: {type: Date},
    cancelledBy: {type: Schema.Types.ObjectId, ref: "User"},
    cancelReason:{type: String},
    paymentMethod: {
      type: String,
      enum: ["cash", "check", ""],
      default: "",
    },
    payments: [
      {
        type: {
          type:String,
          enum: ["cash", "check"],
          required: "true"
        },
        amount: {type: Number, required: true},
        checkNumber: { type: String }
      }
    ],
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending"
    },
    quickbooks: {
      synced: { type: Boolean, default: false },
      qbTxnId: { type: String },
      syncedAt: { type: Date },
      error: { type: String }
    },
  },
  { versionKey: false }
);

export default models.Preorder || model("Preorder", PreorderSchema);
