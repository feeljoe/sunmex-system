import mongoose, { Schema } from 'mongoose';

const SupplierReceiptSchema = new mongoose.Schema(
  {
    invoice: { type: String, required: true },

    poNumber: { type: String, required: true },

    supplierOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupplierOrder',
      required: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },

    requestedAt: { type: Date, required: true },

    receivedAt: {
      type: Date,
      default: Date.now,
    },

    elaboratedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },

        orderedQuantity: { type: Number, required: true },
        receivedQuantity: { type: Number, required: true },
        expirationDate: { type: Date, default: null},
        lotId: { type: Schema.Types.ObjectId },
        unitCost: { type: Number, required: true },   // original
        actualCost: { type: Number, required: true }, // invoice
        lots: [
          {
            lotId: {
              type: Schema.Types.ObjectId,
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
              min: 1,
            },
            expirationDate: {
              type: Date,
              default: null,
            },
          },
        ],
      },
    ],

    total: { type: Number, required: true },
    
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending"
    },
    paidAt: { type: Date, default: null},
    editHistory: [
      {
        editedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        editedAt: {
          type: Date,
          default: Date.now,
        },
        reason: {
          type: String,
          required: true,
          trim: true,
        },
        changes: [
          {
            field: {type: String, required: true},
            product: {
              type: Schema.Types.ObjectId,
              ref: "Product",
              default: null,
            },
            previousValue: Schema.Types.Mixed,
            newValue: Schema.Types.Mixed,
          },
        ],
      },
    ],
    lastEditedAt: {
      type: Date,
      default: null,
    },
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    payments: [
      {
        type: {
          type: String,
          enum: ["cash", "check", "transfer"],
        },
        amount: {type: Number},
        checkNumber: {type: String},
        date: { type: Date },
      },
    ],
    inventoryEditVersion: {
      type: Number,
      default: 0,
    },
    quickbooks: {
      synced: Boolean,
      qbTxnId: String,
      syncedAt: Date
    },    
  },
  { timestamps: true }
);
SupplierReceiptSchema.index(
  {supplierOrder: 1},
  { unique: true}
);

export default mongoose.models.SupplierReceipt ||
  mongoose.model('SupplierReceipt', SupplierReceiptSchema);