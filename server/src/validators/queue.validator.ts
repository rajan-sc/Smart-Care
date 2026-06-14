import { z } from 'zod';

export const advanceQueueSchema = z.object({
  body: z.object({
    action: z.enum(['CALL_NEXT', 'COMPLETE_CURRENT', 'SKIP_CURRENT']),
  }),
});
