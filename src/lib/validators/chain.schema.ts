import { z } from 'zod';

export const ChainSchema = z.object({
  name: z.string().min(1),
});
