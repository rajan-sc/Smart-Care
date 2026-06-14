// ─── Enums ───────────────────────────────────────────────────────────────────

export type Role = 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export type AppointmentType = 'IN_PERSON' | 'TELECONSULT';

export type QueueStatus = 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type Frequency = 'DAILY' | 'TWICE_DAILY' | 'THRICE_DAILY' | 'WEEKLY' | 'AS_NEEDED' | 'CUSTOM';

export type MedicationLogStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED' | 'SNOOZED';

export type VitalType = 'BLOOD_PRESSURE' | 'GLUCOSE' | 'PULSE' | 'WEIGHT' | 'TEMPERATURE' | 'OXYGEN_SATURATION';

export type NotificationType = 'MEDICATION_REMINDER' | 'APPOINTMENT_REMINDER' | 'VITAL_ALERT' | 'CAREGIVER_ALERT' | 'SYSTEM';

export type CaregiverLinkStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

// ─── Models ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string | null;
  isVerified: boolean;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  clinicName: string;
  clinicAddress: string | null;
  consultationFee: number;
  avgConsultationMinutes: number;
  createdAt: string;
  updatedAt: string;
  user?: User;
  availability?: DoctorAvailability[];
}

export interface DoctorAvailability {
  id: string;
  doctorProfileId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  maxPatients: number;
  isActive: boolean;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorProfileId: string;
  scheduledDate: string; // ISO Date
  slotStart: string; // ISO DateTime
  slotEnd: string; // ISO DateTime
  tokenNumber: number;
  status: AppointmentStatus;
  type: AppointmentType;
  notes: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  reason?: string;
  clinicalNotes?: string;
  prescription?: string;
  meetingUrl?: string;
  payment?: any;
  createdAt: string;
  updatedAt: string;
  patient?: User;
  doctor?: User;
  doctorProfile?: DoctorProfile;
  queueToken?: QueueToken;
}

export interface QueueToken {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  tokenNumber: number;
  status: QueueStatus;
  estimatedWaitMinutes: number | null;
  calledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  appointment?: Appointment;
  patient?: User;
  doctor?: User;
}

export interface Medicine {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  unit: string;
  frequency: Frequency;
  timings: string[];
  startDate: string; // ISO Date
  endDate: string | null; // ISO Date
  instructions: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationLog {
  id: string;
  medicineId: string;
  userId: string;
  scheduledAt: string;
  takenAt: string | null;
  status: MedicationLogStatus;
  snoozeUntil: string | null;
  notes: string | null;
  createdAt: string;
  medicine?: Medicine;
}

export interface Vital {
  id: string;
  userId: string;
  vitalType: VitalType;
  values: Record<string, string | number>;
  notes: string | null;
  recordedAt: string;
  createdAt: string;
}

export interface CaregiverLink {
  id: string;
  caregiverId: string;
  patientId: string;
  relationship: string;
  permissions: string[];
  status: CaregiverLinkStatus;
  createdAt: string;
  updatedAt: string;
  caregiver?: User;
  patient?: User;
  latestAlert?: Notification | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AnalyticsSnapshot {
  id: string;
  userId: string;
  date: string;
  adherenceRate: number;
  maxStreak: number;
  currentStreak: number;
  delayedDoses: number;
  vitalsCount: number;
  createdAt: string;
}

// ─── Dashboard Specific DTOs ────────────────────────────────────────────────

export interface PatientDashboardData {
  adherenceRate: number;
  delayedDoses: number;
  vitalsCount: number;
  nextAppointment: Appointment | null;
}

export interface DoctorDashboardData {
  uniquePatients: number;
  totalAppointments: number;
  avgDuration: number;
  queueCompletionRate: number;
}
