import mongoose, { Schema } from "mongoose";

const CounterOrderSchema = new Schema ({
    name: String,
    seq: Number,
});

export default mongoose.models.CounterOrder || mongoose.model("CounterOrder", CounterOrderSchema);