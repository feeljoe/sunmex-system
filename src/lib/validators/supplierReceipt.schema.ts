import { z } from 'zod';

export const OrderedProductSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.enum(["units","cases","layers","pallets"]),
});

export const SupplierReceiptSchema = z.object({
  billNumber: z.string().optional(),
  PONumber: z.string().optional(),
  supplier: z.string().min(1),
  total: z.number().optional(),
  dateOfRequest: z.string().datetime().optional(),
  dateArrived: z.string().datetime().optional(),
  productsOrdered: z.array(OrderedProductSchema).default([]),
  elaboratedBy: z.string().optional(),
  status: z.string().optional(),
});
