import { z } from 'zod';
import { AppointmentType } from '@prisma/client';

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId: z.string().uuid(),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    slotStart: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM'),
    slotEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM'),
    type: z.nativeEnum(AppointmentType).optional().default(AppointmentType.IN_PERSON),
    notes: z.string().optional(),
  }),
});

export const updateNotesSchema = z.object({
  body: z.object({
    clinicalNotes: z.string().optional(),
    medicines: z.array(
      z.object({
        name: z.string().min(1),
        dosage: z.string().min(1),
        unit: z.string().min(1),
        frequency: z.enum(['DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'WEEKLY', 'AS_NEEDED']),
        timings: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM')),
        durationDays: z.number().min(1).optional(),
        instructions: z.string().optional(),
      })
    ).optional(),
  }),
});
