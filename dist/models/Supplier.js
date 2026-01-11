"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// /models/Supplier.ts
var mongoose_1 = require("mongoose");
var AddressSchema = new mongoose_1.Schema({
    addressLine: String, city: String, state: String, country: String, zipCode: String
}, { _id: false });
var SupplierSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    contact: String,
    email: String,
    phoneNumber: String,
    billingAddress: AddressSchema
}, { timestamps: true });
exports.default = mongoose_1.default.models.Supplier || mongoose_1.default.model("Supplier", SupplierSchema);
