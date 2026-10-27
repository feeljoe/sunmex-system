import mongoose, { Schema, model, models } from "mongoose";
const PaymentOperationSchema = new Schema(
    {
        operationId: {
            type: String,
            required: true,
            unique: true,
        },
        documentType: {
            type: String,
            enum: ["preorder", "directSale"],
            required: true,
        },
        documentId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        requestHash: {
            type: String,
            required: true,
        },
        result: {
            type: Schema.Types.Mixed,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);
PaymentOperationSchema.index(
    { operationId: 1 },
    { unique: true }
);
const PaymentOperation = models.PaymentOperation || model("PaymentOperation", PaymentOperationSchema);
export default PaymentOperation;