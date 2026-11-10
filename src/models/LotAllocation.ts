import { Schema } from "mongoose";

export const LotAllocationsSchema = new Schema(
    {
        lotId: {
            type: Schema.Types.ObjectId,
            required: false,
        },
        lotNumber: {
            type: String,
            default: null,
        },
        quantity: {
            type: Number,
            required: true,
            min:0,
        },
        unitCost: {
            type: Number,
            required: true,
            min: 0,
        },
        expirationDate: {
            type: Date,
            default: null,
        },
        inventoryLocation: {
            type: String,
            enum: ["phoenix", "yuma", "tucson", "elPaso", "lasVegas"],
            default: "phoenix",
        },
        lotMatchMethod: {
            type: String,
            enum: ["fifo", "invoice", "exact", "approoximate", "manual", "fallback"],
            default: "fifo",
        },
    },
    {
        _id: false,
    }
);