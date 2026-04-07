import mongoose, { Schema, Document } from "mongoose";

export interface ISupplierOrder extends Document {
    poNumber: string;
    supplier: mongoose.Types.ObjectId;
    products: Array<{productId: mongoose.Types.ObjectId, quantity: number, unit: string}>;
    requestedAt: Date;
    elaboratedBy: string;
    status: string;
    expectedTotal: number;
};

const SupplierOrderSchema = new Schema<ISupplierOrder>(
    {
        poNumber: { type: String, unique: true, required: true},

        supplier: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
            required: true,
        },

        products: [
            {
                product: {
                    type: Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                quantity: { type: Number, required: true },
                unit: { type: String, default: "units" },
            },
        ],
        requestedAt: {type: Date, default: Date.now },

        elaboratedBy: {
            type: String,
        },

        status: {
            type: String,
            enum: ["pending" , "received"],
            default: "pending",
        },
        expectedTotal: {
            type: Number
        }
    },
    {timestamps: true }
);

export default mongoose.models.SupplierOrder || mongoose.model<ISupplierOrder>("SupplierOrder", SupplierOrderSchema);