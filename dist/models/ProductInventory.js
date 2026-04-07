"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var ProductInventorySchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        unique: true, // one inventory record per product
    },
    currentInventory: {
        type: Number,
        default: 0,
        min: 0,
    },
    preSavedInventory: {
        type: Number,
        default: 0,
        min: 0,
    },
    onRouteInventory: {
        type: Number,
        default: 0,
        min: 0,
    },
    inactiveInventory: {
        type: Number,
        default: 0,
        min: 0,
    },
}, {
    timestamps: true,
});
exports.default = mongoose_1.models.ProductInventory ||
    (0, mongoose_1.model)("ProductInventory", ProductInventorySchema);
