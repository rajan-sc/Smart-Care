import { z } from 'zod';


// ─── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name must be at most 50 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name must be at most 50 characters'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
  role: z.enum(['PATIENT', 'DOCTOR', 'CAREGIVER'] as const),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: registerSchema.shape.password,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: registerSchema.shape.password,
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── Doctor Profile ─────────────────────────────────────────────────────────

export const doctorProfileSchema = z.object({
  specialization: z.string().min(2, 'Specialization must be at least 2 characters').max(100),
  clinicName: z.string().min(2, 'Clinic name must be at least 2 characters').max(200),
  clinicAddress: z.string().max(500).optional().or(z.literal('')),
  consultationFee: z.number().min(0, 'Fee cannot be negative'),
  avgConsultationMinutes: z.number().min(1, 'Must be at least 1 minute').max(120, 'Cannot exceed 120 minutes'),
});
export type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;

// ─── Appointments ───────────────────────────────────────────────────────────

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  scheduledDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  slotStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  slotEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  type: z.enum(['IN_PERSON', 'TELECONSULT'] as const),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().or(z.literal('')),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

// ─── Medicine ───────────────────────────────────────────────────────────────

export const medicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required').max(200),
  dosage: z.string().min(1, 'Dosage is required').max(50),
  unit: z.string().min(1, 'Unit is required').max(30),
  frequency: z.enum(['DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'WEEKLY', 'AS_NEEDED', 'CUSTOM'] as const),
  timings: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format')).min(1, 'At least one timing is required'),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date').optional().or(z.literal('')),
  instructions: z.string().optional().or(z.literal('')),
});
export type MedicineInput = z.infer<typeof medicineSchema>;

// ─── Vitals ─────────────────────────────────────────────────────────────────

export const vitalSchema = z.object({
  vitalType: z.enum(['BLOOD_PRESSURE', 'GLUCOSE', 'PULSE', 'WEIGHT', 'TEMPERATURE', 'OXYGEN_SATURATION'] as const),
  values: z.record(z.string(), z.union([z.string(), z.number()])),
  notes: z.string().optional().or(z.literal('')),
});
export type VitalInput = z.infer<typeof vitalSchema>;
