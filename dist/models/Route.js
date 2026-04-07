"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var RouteInventorySchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 0,
    },
}, { _id: false });
var RouteSchema = new mongoose_1.Schema({
    code: {
        type: String,
        required: true,
        unique: true, // "101", "201", etc
    },
    type: {
        type: String,
        enum: ["vendor", "driver", "onRoute"],
        required: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    clients: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Client",
        },
    ],
    activeDriver: {
        type: mongoose_1.Schema.Types.ObjectId, ref: "User",
    },
    inventory: {
        type: [RouteInventorySchema],
        default: [],
    },
    active: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });
exports.default = mongoose_1.models.Route || mongoose_1.default.model("Route", RouteSchema);
