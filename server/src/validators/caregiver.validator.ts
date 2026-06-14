import { z } from 'zod';
import { CaregiverLinkStatus } from '@prisma/client';

export const linkCaregiverSchema = z.object({
  body: z.object({
    caregiverEmail: z.string().email(),
    relationship: z.string().min(1),
    permissions: z.array(z.string()).optional().default(['VIEW_VITALS', 'VIEW_MEDICATIONS', 'RECEIVE_ALERTS']),
  }),
});

export const updateCaregiverLinkSchema = z.object({
  body: z.object({
    status: z.nativeEnum(CaregiverLinkStatus).optional(),
    permissions: z.array(z.string()).optional(),
  }),
});
