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
  },
  {
    timestamps: true,
  }
);

export default models.ProductInventory ||
  model("ProductInventory", ProductInventorySchema);
