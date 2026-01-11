"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// /models/Product.ts
var mongoose_1 = require("mongoose");
var ProductSchema = new mongoose_1.Schema({
    image: { type: String },
    sku: { type: String, required: true, unique: true },
    vendorSku: { type: String },
    upc: { type: String, required: true, unique: true },
    brand: { type: mongoose_1.Schema.Types.ObjectId, ref: "Brand", required: true },
    name: { type: String, required: true },
    productType: { type: mongoose_1.Schema.Types.ObjectId, ref: "Type" },
    productFamily: { type: mongoose_1.Schema.Types.ObjectId, ref: "Family" },
    productLine: { type: mongoose_1.Schema.Types.ObjectId, ref: "Line" },
    unitCost: { type: Number },
    unitPrice: { type: Number },
    caseSize: { type: Number },
    layerSize: { type: Number },
    palletSize: { type: Number },
    weight: { type: Number },
    unit: { type: String,
        enum: ["g", "kg", "mg", "oz", "lb", "fl oz", "ml", "l"]
    },
}, { timestamps: true });
exports.default = mongoose_1.default.models.Product || mongoose_1.default.model("Product", ProductSchema);
