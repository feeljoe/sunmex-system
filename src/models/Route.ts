import mongoose, { Schema, models } from "mongoose";

const RouteInventorySchema = new Schema (
  {
    product: {
      type: Schema.Types.ObjectId, 
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false}
);

const RouteSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true, // "101", "201", etc
    },

    type: {
      type: String,
      enum: ["vendor", "driver", "onRoute"],
      required: true,
    },

    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },

    clients: [
      {
        type: Schema.Types.ObjectId,
        ref: "Client",
      },
    ],
    activeDriver: {
      type: Schema.Types.ObjectId, ref: "User",
    },
    inventory: {
      type: [RouteInventorySchema],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default models.Route || mongoose.model("Route", RouteSchema);
