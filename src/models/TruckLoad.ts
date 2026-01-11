import mongoose, { Schema, models } from "mongoose";

const TruckLoadProductSchema = new Schema(
  {
    productInventory: {
      type: Schema.Types.ObjectId,
      ref: "ProductInventory",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    pickedQuantity: Number,
    actualQuantity: Number,
  },
  { _id: true }
);

const TruckLoadSchema = new Schema(
  {
    route: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },

    products: [TruckLoadProductSchema],

    status: {
      type: String,
      enum: ["pending", "prepared"],
      default: "pending",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default models.TruckLoad || mongoose.model("TruckLoad", TruckLoadSchema);
