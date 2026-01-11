"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// /models/PaymentTerm.ts
var mongoose_1 = require("mongoose");
var PaymentTermSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    dueDays: { type: Number, default: 0 },
    discountDays: { type: Number, default: 0 },
    discountPercentage: { type: Number, default: 0 },
}, { timestamps: true });
exports.default = mongoose_1.default.models.PaymentTerm || mongoose_1.default.model("PaymentTerm", PaymentTermSchema);
