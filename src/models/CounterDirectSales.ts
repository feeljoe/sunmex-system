import mongoose, { Schema } from "mongoose";

const CounterDirectSaleSchema = new Schema ({
    name: String,
    seq: Number,
});

export default mongoose.models.CounterDirectSale || mongoose.model("CounterDirectSale", CounterDirectSaleSchema);