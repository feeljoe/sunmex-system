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
    },
    routeAssigned: {
        type: Schema.Types.ObjectId,
        ref: "Route",
      },
    requestType: {
      type: String,
      enum: ["route", "foreign"],
      default: "route",
      required: true,
    },
    destinationLocation: {
      type: String,
      enum: ["yuma", "tucson", "elPaso", "lasVegas"],
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
    cancelReason: {
      type:String,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: {
      type: Date,
    },
    signature: {type: String},
    deliveryDate: {type: Date},
    deliveredAt: {type: Date},
    warehouseReturnProcessed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LoadRequestSchema.pre("validate", function (next:any) {
  if (this.requestType === "route" && !this.route) {
    throw new Error("Route is required for route load requests");
  }

  if (this.requestType === "foreign" && !this.destinationLocation) {
    throw new Error("Destination location is required for foreign load requests");
  }
});

export default models.LoadRequest ||
  mongoose.model("LoadRequest", LoadRequestSchema);