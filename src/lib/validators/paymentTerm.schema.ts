import { z } from 'zod';

export const PaymentTermSchema = z.object({
  name: z.string().min(1),
  days: z.number().optional(),
  dueOnReceipt: z.boolean().optional(),
});
