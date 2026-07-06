import mongoose, { Schema, model, models } from "mongoose";

const TierSchema = new Schema({
    minPrice: { type: Number, required: true, default: 0},
    maxPrice: {type: Number, default: null},
    percentage: { type: Number, required: true},
});

const RuleSchema = new Schema({
    ruleType: { type: String, enum: ["brand", "category"], required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, refPath: "ruleModel" },
    targetName: { type: String, required: true },
    ruleModel: { type: String, required: true, enum: ["Brand", "Type"]},
    tiers: [TierSchema],
});

const CommissionSettingsSchema = new Schema (
    {
        isSingleton: {type: Boolean, default: true, unique: true},
        defaultPercentage: { type: Number, required: true, default: 1.5},
        rules: [RuleSchema],
        updatedBy: { type: Schema.Types.ObjectId, ref: "User"},
    },
    { timestamps: true, versionKey: false }
);

export default models.CommissionSettings || model("CommissionSettings", CommissionSettingsSchema);