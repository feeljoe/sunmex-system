"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// /models/Chain.ts
var mongoose_1 = require("mongoose");
var ChainSchema = new mongoose_1.Schema({ name: { type: String, required: true, unique: true } });
exports.default = mongoose_1.default.models.Chain || mongoose_1.default.model("Chain", ChainSchema);
