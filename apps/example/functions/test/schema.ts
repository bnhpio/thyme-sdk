import { z } from 'zod';
export const schema = z.object({
  address: z.string().min(1),
});

export type Args = z.infer<typeof schema>;
