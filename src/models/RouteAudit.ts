import mongoose, { Schema, models, model } from "mongoose";

const RouteAuditSchema = new Schema(
  {
    routeAssigned: { type: Schema.Types.ObjectId, ref: "Route", required: true},
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    products: [
      {
        product: { type: Schema.Types.ObjectId, ref: "Product" },
        expectedQuantity: Number,
        actualQuantity: Number,
        difference: Number, // positive = missing/damaged, negative = extra
        reason: String,
        verifiedQuantity: { type: Number, default: 0 },
        newReason: String,
      },
    ],
    warehouseReceivedAt: Date,
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    driverSignature: String,
    warehouseSignature: String,
  },
  { timestamps: true }
);

export default models.RouteAudit || model("RouteAudit", RouteAuditSchema);