import mongoose, { Schema, Types } from "mongoose";

const DirectSaleSchema = new Schema(
    {
        number: {
            type: String,
            required: true,
            unique: true,
        },
        route: {
            type: Types.ObjectId,
            ref: "Route",
            required: true,
        },

        seller: {
            type: Types.ObjectId,
            ref: "User",
            required: true,
        },
        client: {
            type: Types.ObjectId,
            ref: "Client",
            required: true,
        },

        products: [
            {
                product: {
                    type: Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                unitPrice: {
                    type: Number,
                    required: true,
                },
            },
        ],
        total: {
            type: Number,
            required: true,
        },
        signature: {
            type: String,
            required: true,
        },
        deliveredAt: {
            type: Date,
            required: true,
        },
    },
    {timestamps: true}
);

export default mongoose.models.DirectSale || mongoose.model("DirectSale", DirectSaleSchema);