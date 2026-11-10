import mongoose, { Schema, models, model } from "mongoose";

const ProductInventorySchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true, // one inventory record per product
    },

    currentInventory: {
      type: Number,
      default: 0,
      min: 0,
    },

    preSavedInventory: {
      type: Number,
      default: 0,
      min: 0,
    },

    onRouteInventory: {
      type: Number,
      default: 0,
      min: 0,
    },
    inactiveInventory: {
      type: Number,
      default: 0,
      min: 0,
    },
    lots: [
      {
        lotNumber: { type: String },
        cost: { type: Number },
        originalQty: { type: Number },
        currentQty: { type: Number },
        onRouteReservedQty: { type: Number, default: 0, min: 0 },
        receivedAt: { type: Date, default: Date.now },
        expirationDate: {type: Date, default: null },
        hasMovement: {type: Boolean, default: false},
        lastMovementAt: {type: Date, default: null},
      }
    ]
  },
  {
    timestamps: true,
  }
);

export default models.ProductInventory ||
  model("ProductInventory", ProductInventorySchema);
