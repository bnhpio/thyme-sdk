import { z } from 'zod';
export const schema = z.object({});

export type Args = z.infer<typeof schema>;
