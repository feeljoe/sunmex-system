import { z } from 'zod';

export const ClientReceiptProductSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(0),
});

export const ClientReceiptSchema = z.object({
  invoiceNumber: z.string().min(1),
  date: z.string().datetime().optional(),
  user: z.string().optional(),
  client: z.string().optional(),
  products: z.array(ClientReceiptProductSchema).default([]),
  total: z.number().optional(),
  status: z.enum(["pending","paid"]).optional(),
});
