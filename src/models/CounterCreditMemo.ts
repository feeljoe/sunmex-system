import mongoose, { Schema } from "mongoose";

const CounterCreditMemoSchema = new Schema ({
    name: String,
    seq: Number,
});

export default mongoose.models.CounterCreditMemo || mongoose.model("CounterCreditMemo", CounterCreditMemoSchema);