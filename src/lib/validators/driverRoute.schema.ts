import { z } from 'zod';

export const DriverRouteSchema = z.object({
  user: z.string().min(1),
  clientReceipts: z.array(z.string()).optional(),
});
