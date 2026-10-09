import { Schema, model, models } from "mongoose";

const CompanySettingsSchema = new Schema(
    {
        key: {
            type: String,
            default: "main",
            unique: true,
            immutable: true,
        },
        companyName: {
            type: String,
            default: "",
            trim: true,
        },
        address: {
            street: {
                type: String,
                default: "",
                trim: true,
            },
            street2: {
                type: String,
                default: "",
                trim: true,
            },
            city: {
                type: String,
                default: "",
                trim: true,
            },
            state: {
                type: String,
                default: "",
                trim: true,
            },
            zipCode: {
                type: String,
                default: "",
                trim: true,
            },
            country: {
                type: String,
                default: "USA",
                trim: true,
            },
        },
        phone: {
            type: String,
            default: "",
        },
        email: {
            type: String,
            default: "",
        },
        website: {
            type: String,
            default: "",
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);
export default (models.CompanySettings || model("CompanySettings", CompanySettingsSchema));