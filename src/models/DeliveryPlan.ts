import mongoose, { Schema, model, models } from "mongoose";

const DeliveryRouteSummarySchema = new Schema(
    {
        slotKey: {
            type: String,
            required: true,
        },
        route: {
            type: Schema.Types.ObjectId,
            ref: "Route",
            default: null,
        },
        orderCount: {
            type: Number,
            default: 0,
        },
        stopCount: {
            type: Number,
            default: 0,
        },
        subtotal: {
            type: Number,
            default: 0,
        },
        targetSubtotal: {
            type: Number,
            default: 0,
        },
        subtotalVariance: {
            type: Number,
            default: 0,
        },
        estimatedDistanceMiles: {
            type: Number,
            default: 0,
        },
        estimatedDriveMinutes: {
            type: Number,
            defualt: 0,
        },
    },
    {
        _id: false,
    }
);

const DeliveryPlanSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        depot: {
            companySettings: {
                type: Schema.Types.ObjectId,
                ref: "CompanySettings",
                required: true,
            },
            companyName: {
                type: String,
                default: "",
            },
            address: {
                street: {
                    type: String,
                    default: "",
                },
                street2: {
                    type: String,
                    default: "",
                },
                city: {
                    type: String,
                    default: "",
                },
                state: {
                    type: String,
                    default: 0,
                },
                zipCode: {
                    type: String,
                    default: "",
                },
                country: {
                    type: String,
                    default: "USA",
                },
            },
            coordinates: {
                latitude: Number,
                longitude: Number,

                formattedAddress: String,

                geocodedAt: Date,

                geocodeStatus: {
                    type: String,
                    enum: [
                        "pending",
                        "success",
                        "failed",
                        "manual",
                    ],
                    default: "pending",
                },
            },
        },
        deliveryDate: {
            type: Date,
            required: true,
            index: true,
        },
        inventoryLocation: {
            type: String,
            enum: [
                "phoenix", "yuma", "elPaso", "lasVegas",
            ],
            default: "phoenix",
        },
        status: {
            type: String,
            enum: [
                "draft", "calculating", "ready", "approved", "applied", "cancelled",
            ],
            default: "draft",
            index: true,
        },
        settings: {
            maxStopsPerRoute: {
                type: Number,
                required: true,
                min: 1,
            },
            maxOrdersPerRoute: {
                type: Number,
                default: null,
                min: 1,
            },
            weights: {
                geography: {
                    type: Number,
                    default: 60,
                },
                subtotal: {
                    type: Number,
                    default: 30,
                },
                workload: {
                    type: Number,
                    default: 10,
                },
            },
            startAtDepot: {
                type: Boolean,
                default: true,
            },
            returnToDepot: {
                type: Boolean,
                default: true,
            },
        },
        totals: {
            orderCount: {
                type: Number,
                default: 0,
            },
            stopCount: {
                type: Number,
                default: 0,
            },
            subtotal: {
                type: Number,
                default: 0,
            },
            requiredRouteCount: {
                type: Number,
                default: 0,
            },
            targetSubtotalPerRoute: {
                type: Number,
                default: 0,
            },
        },
        routeSummaries: {
            type: [DeliveryRouteSummarySchema],
            default: [],
        },
        sourceSnapshotAt: {
            type: Date,
            default: Date.now,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        approvedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        approvedAt: Date,
        appliedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        appliedAt: Date,
    },
    {
        timestamps: true,
    }
);

DeliveryPlanSchema.index({
    deliveryDate: 1,
    status: 1,
});

export default models.DeliveryPlan || model("DeliveryPlan", DeliveryPlanSchema);