import mongoose, { Schema, models, model } from "mongoose";

const ForeignInventorySchema = new Schema(
  {
    location: {
        type: String,
        enum: ["yuma", "tucson", "elPaso", "lasVegas"],
        required: true,
        index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
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
        expirationDate: {type: Date, default: null},
        hasMovement: {type: Boolean, default: false},
        lastMovementAt: {type: Date, default: null},
      }
    ],
  },
  {
    timestamps: true,
  }
);

ForeignInventorySchema.index(
    { location: 1, product: 1 },
    { unique: true }
);

export default models.ForeignInventory ||
  model("ForeignInventory", ForeignInventorySchema);
