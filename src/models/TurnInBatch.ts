import mongoose, { Schema, model, models } from "mongoose";

const TurnInBatchSchema = new Schema(
  {
    driver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    route: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    orders: [{ type: Schema.Types.ObjectId, ref: "PreOrder" }],

    totalCash: { type: Number, default: 0 },
    totalChecks: { type: Number, default: 0 },

    closedAt: { type: Date },
  },
  { timestamps: true }
);

export default models.TurnInBatch ||
  model("TurnInBatch", TurnInBatchSchema);