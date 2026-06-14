import { z } from 'zod';

export const getNotificationsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform(val => (val ? parseInt(val) : 1)),
    limit: z.string().optional().transform(val => {
      const parsed = val ? parseInt(val) : 10;
      return parsed > 20 ? 20 : parsed; // Cap at 20
    }),
  }),
});
