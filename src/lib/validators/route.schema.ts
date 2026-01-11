import { z } from 'zod';

export const RouteSchema = z.object({
  routeNumber: z.string().min(1),
  user: z.string().optional(),
  isAssigned: z.boolean().optional(),
});
