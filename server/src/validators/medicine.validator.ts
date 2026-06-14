import { z } from 'zod';
import { Frequency } from '@prisma/client';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createMedicineSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    dosage: z.string().min(1).max(50),
    unit: z.string().min(1).max(30),
    frequency: z.nativeEnum(Frequency),
    timings: z.array(z.string().regex(timeRegex)).min(1),
    startDate: z.string().refine(val => new Date(val).getTime() >= new Date(new Date().setHours(0,0,0,0)).getTime(), { message: 'startDate must be today or in the future' }),
    endDate: z.string().optional(),
    instructions: z.string().optional()
  }).refine(data => {
    if (data.endDate) {
      return new Date(data.endDate).getTime() > new Date(data.startDate).getTime();
    }
    return true;
  }, { message: 'endDate must be after startDate', path: ['endDate'] })
});

export const skipLogSchema = z.object({
  body: z.object({
    reason: z.string().min(1)
  })
});

export const snoozeLogSchema = z.object({
  body: z.object({
    snoozeMinutes: z.number().min(1).max(1440)
  })
});
