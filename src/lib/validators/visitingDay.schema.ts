import { z } from 'zod';

export const VisitingDaySchema = z.object({
  visitingDay: z.string().min(1),
});
