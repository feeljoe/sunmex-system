import mongoose, { Schema } from "mongoose";

const CounterLoadRequestSchema = new Schema ({
    name: String,
    seq: Number,
});

export default mongoose.models.CounterLoadRequest || mongoose.model("CounterLoadRequest", CounterLoadRequestSchema);