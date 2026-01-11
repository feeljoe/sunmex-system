import mongoose, { Schema } from "mongoose";

const CounterClientSchema = new Schema ({
    name: String,
    seq: Number,
});

export default mongoose.models.CounterClient || mongoose.model("CounterClient", CounterClientSchema);