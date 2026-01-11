"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// /models/Client.ts
var mongoose_1 = require("mongoose");
var AddressSchema = new mongoose_1.Schema({
    addressLine: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
}, { _id: false });
var ClientSchema = new mongoose_1.Schema({
    clientNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true },
    chain: { type: mongoose_1.Schema.Types.ObjectId, ref: "Chain" },
    contactName: String,
    phoneNumber: String,
    billingAddress: AddressSchema,
    paymentTerm: { type: mongoose_1.Schema.Types.ObjectId, ref: "PaymentTerm" },
    creditLimit: Number,
    frequency: { type: String, required: true },
    visitingDays: {
        type: [String], // 👈 THIS IS THE FIX
        required: true,
    },
}, { timestamps: true });
exports.default = mongoose_1.default.models.Client || mongoose_1.default.model("Client", ClientSchema);
