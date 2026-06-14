import { z } from 'zod';
import { DayOfWeek } from '@prisma/client';

export const updateDoctorProfileSchema = z.object({
  body: z.object({
    specialization: z.string().min(1).optional(),
    clinicName: z.string().min(1).optional(),
    clinicAddress: z.string().optional(),
    consultationFee: z.number().min(0).optional(),
    avgConsultationMinutes: z.number().int().min(1).optional(),
  }),
});

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilitySlotSchema = z.object({
  dayOfWeek: z.nativeEnum(DayOfWeek),
  startTime: z.string().regex(timeRegex, 'Must be in HH:MM format'),
  endTime: z.string().regex(timeRegex, 'Must be in HH:MM format'),
  maxPatients: z.number().int().min(1),
}).refine((data) => {
  return data.startTime < data.endTime;
}, {
  message: 'Start time must be before end time',
  path: ['endTime']
});

export const updateAvailabilitySchema = z.object({
  body: z.object({
    availability: z.array(availabilitySlotSchema),
  }),
});
