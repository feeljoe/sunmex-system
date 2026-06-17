import mongoose, { Schema, models } from "mongoose";

const LoadRequestProductSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    requestedQuantity: {type: Number, min: 0},
    approvedQuantity: {type: Number},
    assembledQuantity: {type: Number},
    deliveredQuantity: {type: Number},
    differenceReason: {type: String},

  },
  { _id: false }
);

const LoadRequestSchema = new Schema(
  {
    LRNumber:{
        type: String,
        required: true,
        unique: true,
    },
    route: {
      type: Schema.Types.ObjectId,
      ref: "Route",
      required: true,
    },
    routeAssigned: {
        type: Schema.Types.ObjectId,
        ref: "Route",
      },

    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedAt: {type: Date},

    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    reviewedAt: {type: Date},

    assembledBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    assembledAt: {type: Date},

    products: [LoadRequestProductSchema],

    status: {
      type: String,
      enum: ["pending", "approved", "assigned", "prepared", "delivered", "rejected", "cancelled"],
      default: "pending",
    },
    signature: {type: String},
    deliveryDate: {type: Date},
    deliveredAt: {type: Date},
  },
  { timestamps: true }
);

export default models.LoadRequest ||
  mongoose.model("LoadRequest", LoadRequestSchema);