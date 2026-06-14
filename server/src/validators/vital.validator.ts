import { z } from 'zod';
import { VitalType } from '@prisma/client';

export const recordVitalSchema = z.object({
  body: z.object({
    vitalType: z.nativeEnum(VitalType),
    recordedAt: z.string().datetime().optional(),
    notes: z.string().optional(),
    values: z.any()
  }).superRefine((data, ctx) => {
    switch (data.vitalType) {
      case VitalType.BLOOD_PRESSURE: {
        const val = data.values as { systolic?: number, diastolic?: number };
        if (typeof val.systolic !== 'number' || val.systolic < 50 || val.systolic > 300) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Systolic BP must be between 50 and 300 mmHg', path: ['values', 'systolic'] });
        }
        if (typeof val.diastolic !== 'number' || val.diastolic < 30 || val.diastolic > 200) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Diastolic BP must be between 30 and 200 mmHg', path: ['values', 'diastolic'] });
        }
        break;
      }
      case VitalType.GLUCOSE: {
        const val = data.values as { value?: number, isFasting?: boolean };
        if (typeof val.value !== 'number' || val.value < 20 || val.value > 1000) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Glucose must be between 20 and 1000 mg/dL', path: ['values', 'value'] });
        }
        if (typeof val.isFasting !== 'boolean') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'isFasting must be a boolean', path: ['values', 'isFasting'] });
        }
        break;
      }
      case VitalType.PULSE: {
        const val = data.values as { bpm?: number };
        if (typeof val.bpm !== 'number' || val.bpm < 30 || val.bpm > 250) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Pulse must be between 30 and 250 bpm', path: ['values', 'bpm'] });
        }
        break;
      }
      case VitalType.WEIGHT: {
        const val = data.values as { value?: number, unit?: string };
        if (typeof val.value !== 'number' || val.value <= 0) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Weight must be a positive number', path: ['values', 'value'] });
        }
        if (val.unit !== 'kg' && val.unit !== 'lbs') {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unit must be 'kg' or 'lbs'", path: ['values', 'unit'] });
        }
        break;
      }
    }
  })
});
