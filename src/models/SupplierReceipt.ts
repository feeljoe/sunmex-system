import mongoose from 'mongoose';

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

        unitCost: { type: Number, required: true },   // original
        actualCost: { type: Number, required: true }, // invoice
      },
    ],

    total: { type: Number, required: true },
    
    quickbooks: {
      synced: Boolean,
      qbTxnId: String,
      syncedAt: Date
    },    
  },
  { timestamps: true }
);

export default mongoose.models.SupplierReceipt ||
  mongoose.model('SupplierReceipt', SupplierReceiptSchema);
