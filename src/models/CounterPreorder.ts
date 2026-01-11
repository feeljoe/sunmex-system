import mongoose, { Schema } from "mongoose";

const CounterPreorderSchema = new Schema ({
    name: String,
    seq: Number,
});

export default mongoose.models.CounterPreorder || mongoose.model("CounterPreorder", CounterPreorderSchema);