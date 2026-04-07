"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// models/CreditMemo.ts
var mongoose_1 = require("mongoose");
var CreditMemoSchema = new mongoose_1.Schema({
    number: { type: String, required: true, unique: true },
    client: { type: mongoose_1.Schema.Types.ObjectId, ref: "Client", required: true },
    products: [
        {
            product: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, required: true },
            pickedQuantity: { type: Number, default: 0 },
            returnedQuantity: { type: Number },
            actualCost: { type: Number, default: 0 }, // optional if cost changes
            returnReason: {
                type: String,
                enum: ["credit memo", "good return", "no cost"],
            }
        },
    ],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    subtotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ["pending", "received", "cancelled"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    routeAssigned: { type: mongoose_1.Schema.Types.ObjectId, ref: "Route" },
    returnedAt: { type: Date },
    returnSignature: {
        type: String,
    },
    cancelledAt: { type: Date },
    cancelledBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String },
}, { versionKey: false });
exports.default = mongoose_1.models.CreditMemo || (0, mongoose_1.model)("CreditMemo", CreditMemoSchema);
