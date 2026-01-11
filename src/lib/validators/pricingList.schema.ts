import { z } from 'zod';

export const PricingEntrySchema = z.object({
  productId: z.string().optional(),
  brandId: z.string().optional(),
  price: z.number(),
});

export const PricingListSchema = z.object({
  name: z.string().min(1),
  brandIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  clientsAssigned: z.array(z.string()).optional(),
  pricing: z.array(PricingEntrySchema).optional(),
});
