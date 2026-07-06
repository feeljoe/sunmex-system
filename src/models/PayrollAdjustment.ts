// models/PayrollAdjustment.ts
import { Schema, model, models } from "mongoose";

const PayrollAdjustmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["bonus", "deduction"], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true }, // e.g., "Holiday Bonus", "Performance Metric"
    date: { type: Date, required: true }, // The date the bonus was earned/applied
    processed: { type: Boolean, default: false }, // Flips to true when the paycheck is marked "Paid"
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false }
);

export default models.PayrollAdjustment || model("PayrollAdjustment", PayrollAdjustmentSchema);