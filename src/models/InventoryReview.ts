import mongoose, { Schema, Types } from "mongoose";

const InventoryReviewSchema = new Schema({
    status: {
        type: String,
        enum: ["pending", "reviewed"],
        default: "pending",
    },
    product: {
        type: Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    differenceReason: {
        type: String, 
        enum: ["productDamaged", "productExpired", "productNotAvailable"],
        required: true,
    },
    authorizedBy: {
        type: Types.ObjectId, 
        ref: "User",
        required: true,
    },
    generatedBy: {
        type: Types.ObjectId,
        ref: "User",
        required: true,
    },
    resolvedBy: {
        type: Types.ObjectId,
        ref: "User",
    },
    source: {
        type: Types.ObjectId,
        ref: "Preorder",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    resolvedAt: {
        type: Date,
        default: null,
    },
});

export default mongoose.models.InventoryReview || mongoose.model("InventoryReview", InventoryReviewSchema);