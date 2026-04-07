"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var TypeSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true }
}, { timestamps: true });
exports.default = mongoose_1.default.models.Type || mongoose_1.default.model("Type", TypeSchema);
