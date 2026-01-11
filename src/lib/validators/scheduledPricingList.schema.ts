import { z } from 'zod';

export const ScheduledPricingEntrySchema = z.object({
  productId: z.string().optional(),
  brandId: z.string().optional(),
  price: z.number(),
});

export const ScheduledPricingListSchema = z.object({
  name: z.string().min(1),
  brandIds: z.array(z.string()).optional(),
  productIds: z.array(z.string()).optional(),
  clientsAssigned: z.array(z.string()).optional(),
  pricing: z.array(ScheduledPricingEntrySchema).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
