# SmartCare — Prisma Schema Design

> **Database**: PostgreSQL 15+
> **ORM**: Prisma 5.x
> **Language**: TypeScript
> **Last Updated**: 2026-06-06

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prisma Configuration](#2-prisma-configuration)
3. [Schema Conventions](#3-schema-conventions)
4. [Complete Prisma Schema](#4-complete-prisma-schema)
5. [Model-by-Model Breakdown](#5-model-by-model-breakdown)
6. [Entity-Relationship Diagram](#6-entity-relationship-diagram)
7. [Index Justifications](#7-index-justifications)
8. [Prisma Client Generation Notes](#8-prisma-client-generation-notes)
9. [Seed Data Strategy](#9-seed-data-strategy)
10. [Migration Workflow](#10-migration-workflow)

---

## 1. Overview

SmartCare is a patient care platform for chronic illness management. The schema supports four roles — **patient**, **doctor**, **caregiver**, and **admin** — across these functional domains:

| Domain | Models |
|---|---|
| Identity & Auth | `User`, `RefreshToken` |
| Doctor Management | `DoctorProfile`, `DoctorAvailability` |
| Appointments & Queue | `Appointment`, `QueueToken` |
| Medication Engine | `Medicine`, `MedicationLog` |
| Vitals Monitoring | `Vital` |
| Caregiver Network | `CaregiverLink` |
| Communication | `Notification` |
| Observability | `AuditLog` |
| Billing | `Payment` |
| Documents | `MedicalRecord` |

---

## 2. Prisma Configuration

### Datasource

```prisma
// ============================================================
// SmartCare — Prisma Schema
// Database: PostgreSQL 17
// ============================================================

datasource db {
  provider = "postgresql"
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]
}

// ============================================================
// ENUMS
// ============================================================

enum Role {
  PATIENT
  DOCTOR
  CAREGIVER
  ADMIN

  @@map("role")
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY

  @@map("day_of_week")
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW

  @@map("appointment_status")
}

enum AppointmentType {
  IN_PERSON
  TELECONSULT

  @@map("appointment_type")
}

enum QueueStatus {
  WAITING
  IN_PROGRESS
  COMPLETED
  SKIPPED

  @@map("queue_status")
}

enum Frequency {
  DAILY
  TWICE_DAILY
  THRICE_DAILY
  WEEKLY
  AS_NEEDED
  CUSTOM

  @@map("frequency")
}

enum MedicationLogStatus {
  PENDING
  TAKEN
  SKIPPED
  MISSED
  SNOOZED

  @@map("medication_log_status")
}

enum VitalType {
  BLOOD_PRESSURE
  GLUCOSE
  PULSE
  WEIGHT
  TEMPERATURE
  OXYGEN_SATURATION

  @@map("vital_type")
}

enum NotificationType {
  MEDICATION_REMINDER
  APPOINTMENT_REMINDER
  VITAL_ALERT
  CAREGIVER_ALERT
  SYSTEM

  @@map("notification_type")
}

enum CaregiverLinkStatus {
  PENDING
  ACCEPTED
  REJECTED

  @@map("caregiver_link_status")
}

// ============================================================
// MODELS
// ============================================================

// ------------------------------------------------------------
// 1. User — Central identity for all roles
// ------------------------------------------------------------
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         Role
  firstName    String    @map("first_name") @db.VarChar(100)
  lastName     String    @map("last_name") @db.VarChar(100)
  phone        String?   @db.VarChar(20)
  isVerified   Boolean   @default(false) @map("is_verified")
  isActive     Boolean   @default(true) @map("is_active")
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  doctorProfile         DoctorProfile?
  appointmentsAsPatient Appointment[]    @relation("PatientAppointments")
  appointmentsAsDoctor  Appointment[]    @relation("DoctorAppointments")
  queueTokensAsDoctor   QueueToken[]     @relation("DoctorQueueTokens")
  queueTokensAsPatient  QueueToken[]     @relation("PatientQueueTokens")
  medicines             Medicine[]
  medicationLogs        MedicationLog[]
  vitals                Vital[]
  caregiverLinks        CaregiverLink[]  @relation("CaregiverUser")
  patientLinks          CaregiverLink[]  @relation("PatientUser")
  notifications         Notification[]
  auditLogs             AuditLog[]
  refreshTokens         RefreshToken[]
  analyticsSnapshots    AnalyticsSnapshot[]

  @@index([email])
  @@index([role])
  @@index([isActive, deletedAt])
  @@map("users")
}

// ------------------------------------------------------------
// 2. DoctorProfile — Extended profile for DOCTOR users
// ------------------------------------------------------------
model DoctorProfile {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @unique @map("user_id") @db.Uuid
  specialization         String   @db.VarChar(150)
  clinicName             String   @map("clinic_name") @db.VarChar(200)
  clinicAddress          String?  @map("clinic_address") @db.Text
  consultationFee        Decimal  @map("consultation_fee") @db.Decimal(10, 2)
  avgConsultationMinutes Int      @default(15) @map("avg_consultation_minutes")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user          User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  availability  DoctorAvailability[]
  appointments  Appointment[]

  @@index([specialization])
  @@map("doctor_profiles")
}

// ------------------------------------------------------------
// 3. DoctorAvailability — Weekly recurring slot definitions
// ------------------------------------------------------------
model DoctorAvailability {
  id              String    @id @default(uuid()) @db.Uuid
  doctorProfileId String    @map("doctor_profile_id") @db.Uuid
  dayOfWeek       DayOfWeek @map("day_of_week")
  startTime       String    @map("start_time") @db.VarChar(5) // "09:00"
  endTime         String    @map("end_time") @db.VarChar(5)   // "17:00"
  maxPatients     Int       @default(20) @map("max_patients")
  isActive        Boolean   @default(true) @map("is_active")

  // --- Relations ---
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Cascade)

  @@unique([doctorProfileId, dayOfWeek, startTime], name: "uq_doctor_day_slot")
  @@index([doctorProfileId, isActive])
  @@map("doctor_availability")
}

// ------------------------------------------------------------
// 4. Appointment — Scheduled visit between patient and doctor
// ------------------------------------------------------------
model Appointment {
  id              String            @id @default(uuid()) @db.Uuid
  patientId       String            @map("patient_id") @db.Uuid
  doctorId        String            @map("doctor_id") @db.Uuid
  doctorProfileId String            @map("doctor_profile_id") @db.Uuid
  scheduledDate   DateTime          @map("scheduled_date") @db.Date
  slotStart       DateTime          @map("slot_start") @db.Timestamptz
  slotEnd         DateTime          @map("slot_end") @db.Timestamptz
  tokenNumber     Int               @map("token_number")
  status          AppointmentStatus @default(PENDING)
  type            AppointmentType   @default(IN_PERSON)
  notes           String?           @db.Text
  cancelReason    String?           @map("cancel_reason") @db.Text
  cancelledBy     String?           @map("cancelled_by") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  patient       User          @relation("PatientAppointments", fields: [patientId], references: [id], onDelete: Restrict)
  doctor        User          @relation("DoctorAppointments", fields: [doctorId], references: [id], onDelete: Restrict)
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Restrict)
  queueToken    QueueToken?

  @@unique([doctorId, scheduledDate, tokenNumber], name: "uq_doctor_date_token")
  @@index([patientId, status])
  @@index([doctorId, scheduledDate])
  @@index([scheduledDate, status])
  @@index([status])
  @@map("appointments")
}

// ------------------------------------------------------------
// 5. QueueToken — Real-time queue position for an appointment
// ------------------------------------------------------------
model QueueToken {
  id                  String      @id @default(uuid()) @db.Uuid
  appointmentId       String      @unique @map("appointment_id") @db.Uuid
  doctorId            String      @map("doctor_id") @db.Uuid
  patientId           String      @map("patient_id") @db.Uuid
  tokenNumber         Int         @map("token_number")
  status              QueueStatus @default(WAITING)
  estimatedWaitMinutes Int?       @map("estimated_wait_minutes")
  calledAt            DateTime?   @map("called_at") @db.Timestamptz
  completedAt         DateTime?   @map("completed_at") @db.Timestamptz
  createdAt           DateTime    @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  doctor      User        @relation("DoctorQueueTokens", fields: [doctorId], references: [id], onDelete: Restrict)
  patient     User        @relation("PatientQueueTokens", fields: [patientId], references: [id], onDelete: Restrict)

  @@index([doctorId, status])
  @@index([doctorId, createdAt])
  @@map("queue_tokens")
}

// ------------------------------------------------------------
// 6. Medicine — Recurring medication schedule definition
// ------------------------------------------------------------
model Medicine {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  name         String    @db.VarChar(200)
  dosage       String    @db.VarChar(50)  // e.g. "500" or "10"
  unit         String    @db.VarChar(30)  // e.g. "mg", "ml", "tablets"
  frequency    Frequency
  timings      String[]  @db.VarChar(5)   // ["08:00", "14:00", "21:00"]
  startDate    DateTime  @map("start_date") @db.Date
  endDate      DateTime? @map("end_date") @db.Date
  instructions String?   @db.Text
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  medicationLogs MedicationLog[]

  @@index([userId, isActive])
  @@index([userId, startDate, endDate])
  @@map("medicines")
}

// ------------------------------------------------------------
// 7. MedicationLog — Individual dose-level adherence record
// ------------------------------------------------------------
model MedicationLog {
  id          String              @id @default(uuid()) @db.Uuid
  medicineId  String              @map("medicine_id") @db.Uuid
  userId      String              @map("user_id") @db.Uuid
  scheduledAt DateTime            @map("scheduled_at") @db.Timestamptz
  takenAt     DateTime?           @map("taken_at") @db.Timestamptz
  status      MedicationLogStatus @default(PENDING)
  snoozeUntil DateTime?           @map("snooze_until") @db.Timestamptz
  notes       String?             @db.Text
  createdAt   DateTime            @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([medicineId, scheduledAt], name: "uq_medicine_scheduled")
  @@index([userId, scheduledAt])
  @@index([userId, status])
  @@index([scheduledAt, status])
  @@map("medication_logs")
}

// ------------------------------------------------------------
// 8. Vital — Point-in-time health measurement
// ------------------------------------------------------------
model Vital {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  vitalType  VitalType @map("type")
  values     Json      @db.JsonB
  notes      String?   @db.Text
  recordedAt DateTime  @map("recorded_at") @db.Timestamptz
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, vitalType, recordedAt])
  @@index([userId, recordedAt])
  @@map("vitals")
}

// ------------------------------------------------------------
// 9. CaregiverLink — Permission-based caregiver-patient link
// ------------------------------------------------------------
model CaregiverLink {
  id           String   @id @default(uuid()) @db.Uuid
  caregiverId  String   @map("caregiver_id") @db.Uuid
  patientId    String   @map("patient_id") @db.Uuid
  relationship String   @db.VarChar(50) // "spouse", "child", "sibling", etc.
  permissions  String[] // ["VIEW_VITALS", "VIEW_MEDICATIONS", "VIEW_APPOINTMENTS", "BOOK_APPOINTMENTS", "RECEIVE_ALERTS"]
  status       CaregiverLinkStatus @default(PENDING)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  caregiver User @relation("CaregiverUser", fields: [caregiverId], references: [id], onDelete: Cascade)
  patient   User @relation("PatientUser", fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([caregiverId, patientId], name: "uq_caregiver_patient")
  @@index([patientId, status])
  @@map("caregiver_links")
}

// ------------------------------------------------------------
// 10. Notification — Multi-channel notification record
// ------------------------------------------------------------
model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(200)
  message   String           @db.Text
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at") @db.Timestamptz
  metadata  Json?            @db.JsonB
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, type, createdAt])
  @@index([createdAt])
  @@map("notifications")
}

// ------------------------------------------------------------
// 11. AuditLog — Immutable system-wide change log
// ------------------------------------------------------------
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  action    String   @db.VarChar(50) // "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity    String   @db.VarChar(50) // "User", "Appointment", etc.
  entityId  String   @map("entity_id") @db.VarChar(100)
  oldValues Json?    @map("old_values") @db.JsonB
  newValues Json?    @map("new_values") @db.JsonB
  ipAddress String?  @map("ip_address") @db.VarChar(45) // IPv6 max length
  userAgent String?  @map("user_agent") @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ------------------------------------------------------------
// 12. RefreshToken — JWT refresh token rotation tracking
// ------------------------------------------------------------
model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  isRevoked Boolean  @default(false) @map("is_revoked")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

// ------------------------------------------------------------
// 13. AnalyticsSnapshot — Nightly precomputed stats
// ------------------------------------------------------------
model AnalyticsSnapshot {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  date            DateTime @db.Date
  adherenceRate   Float    @map("adherence_rate")
  maxStreak       Int      @map("max_streak")
  currentStreak   Int      @map("current_streak")
  delayedDoses    Int      @map("delayed_doses")
  vitalsCount     Int      @map("vitals_count")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date], name: "uq_user_date")
  @@index([date])
  @@map("analytics_snapshots")
}

```

- `DATABASE_URL` format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`
- Connection pooling via PgBouncer is recommended for production. When using PgBouncer, add `&pgbouncer=true&connection_limit=1` to the URL.

### Generator

```prisma
// ============================================================
// SmartCare — Prisma Schema
// Database: PostgreSQL 17
// ============================================================

datasource db {
  provider = "postgresql"
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]
}

// ============================================================
// ENUMS
// ============================================================

enum Role {
  PATIENT
  DOCTOR
  CAREGIVER
  ADMIN

  @@map("role")
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY

  @@map("day_of_week")
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW

  @@map("appointment_status")
}

enum AppointmentType {
  IN_PERSON
  TELECONSULT

  @@map("appointment_type")
}

enum QueueStatus {
  WAITING
  IN_PROGRESS
  COMPLETED
  SKIPPED

  @@map("queue_status")
}

enum Frequency {
  DAILY
  TWICE_DAILY
  THRICE_DAILY
  WEEKLY
  AS_NEEDED
  CUSTOM

  @@map("frequency")
}

enum MedicationLogStatus {
  PENDING
  TAKEN
  SKIPPED
  MISSED
  SNOOZED

  @@map("medication_log_status")
}

enum VitalType {
  BLOOD_PRESSURE
  GLUCOSE
  PULSE
  WEIGHT
  TEMPERATURE
  OXYGEN_SATURATION

  @@map("vital_type")
}

enum NotificationType {
  MEDICATION_REMINDER
  APPOINTMENT_REMINDER
  VITAL_ALERT
  CAREGIVER_ALERT
  SYSTEM

  @@map("notification_type")
}

enum CaregiverLinkStatus {
  PENDING
  ACCEPTED
  REJECTED

  @@map("caregiver_link_status")
}

// ============================================================
// MODELS
// ============================================================

// ------------------------------------------------------------
// 1. User — Central identity for all roles
// ------------------------------------------------------------
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         Role
  firstName    String    @map("first_name") @db.VarChar(100)
  lastName     String    @map("last_name") @db.VarChar(100)
  phone        String?   @db.VarChar(20)
  isVerified   Boolean   @default(false) @map("is_verified")
  isActive     Boolean   @default(true) @map("is_active")
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  doctorProfile         DoctorProfile?
  appointmentsAsPatient Appointment[]    @relation("PatientAppointments")
  appointmentsAsDoctor  Appointment[]    @relation("DoctorAppointments")
  queueTokensAsDoctor   QueueToken[]     @relation("DoctorQueueTokens")
  queueTokensAsPatient  QueueToken[]     @relation("PatientQueueTokens")
  medicines             Medicine[]
  medicationLogs        MedicationLog[]
  vitals                Vital[]
  caregiverLinks        CaregiverLink[]  @relation("CaregiverUser")
  patientLinks          CaregiverLink[]  @relation("PatientUser")
  notifications         Notification[]
  auditLogs             AuditLog[]
  refreshTokens         RefreshToken[]
  analyticsSnapshots    AnalyticsSnapshot[]

  @@index([email])
  @@index([role])
  @@index([isActive, deletedAt])
  @@map("users")
}

// ------------------------------------------------------------
// 2. DoctorProfile — Extended profile for DOCTOR users
// ------------------------------------------------------------
model DoctorProfile {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @unique @map("user_id") @db.Uuid
  specialization         String   @db.VarChar(150)
  clinicName             String   @map("clinic_name") @db.VarChar(200)
  clinicAddress          String?  @map("clinic_address") @db.Text
  consultationFee        Decimal  @map("consultation_fee") @db.Decimal(10, 2)
  avgConsultationMinutes Int      @default(15) @map("avg_consultation_minutes")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user          User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  availability  DoctorAvailability[]
  appointments  Appointment[]

  @@index([specialization])
  @@map("doctor_profiles")
}

// ------------------------------------------------------------
// 3. DoctorAvailability — Weekly recurring slot definitions
// ------------------------------------------------------------
model DoctorAvailability {
  id              String    @id @default(uuid()) @db.Uuid
  doctorProfileId String    @map("doctor_profile_id") @db.Uuid
  dayOfWeek       DayOfWeek @map("day_of_week")
  startTime       String    @map("start_time") @db.VarChar(5) // "09:00"
  endTime         String    @map("end_time") @db.VarChar(5)   // "17:00"
  maxPatients     Int       @default(20) @map("max_patients")
  isActive        Boolean   @default(true) @map("is_active")

  // --- Relations ---
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Cascade)

  @@unique([doctorProfileId, dayOfWeek, startTime], name: "uq_doctor_day_slot")
  @@index([doctorProfileId, isActive])
  @@map("doctor_availability")
}

// ------------------------------------------------------------
// 4. Appointment — Scheduled visit between patient and doctor
// ------------------------------------------------------------
model Appointment {
  id              String            @id @default(uuid()) @db.Uuid
  patientId       String            @map("patient_id") @db.Uuid
  doctorId        String            @map("doctor_id") @db.Uuid
  doctorProfileId String            @map("doctor_profile_id") @db.Uuid
  scheduledDate   DateTime          @map("scheduled_date") @db.Date
  slotStart       DateTime          @map("slot_start") @db.Timestamptz
  slotEnd         DateTime          @map("slot_end") @db.Timestamptz
  tokenNumber     Int               @map("token_number")
  status          AppointmentStatus @default(PENDING)
  type            AppointmentType   @default(IN_PERSON)
  notes           String?           @db.Text
  cancelReason    String?           @map("cancel_reason") @db.Text
  cancelledBy     String?           @map("cancelled_by") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  patient       User          @relation("PatientAppointments", fields: [patientId], references: [id], onDelete: Restrict)
  doctor        User          @relation("DoctorAppointments", fields: [doctorId], references: [id], onDelete: Restrict)
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Restrict)
  queueToken    QueueToken?

  @@unique([doctorId, scheduledDate, tokenNumber], name: "uq_doctor_date_token")
  @@index([patientId, status])
  @@index([doctorId, scheduledDate])
  @@index([scheduledDate, status])
  @@index([status])
  @@map("appointments")
}

// ------------------------------------------------------------
// 5. QueueToken — Real-time queue position for an appointment
// ------------------------------------------------------------
model QueueToken {
  id                  String      @id @default(uuid()) @db.Uuid
  appointmentId       String      @unique @map("appointment_id") @db.Uuid
  doctorId            String      @map("doctor_id") @db.Uuid
  patientId           String      @map("patient_id") @db.Uuid
  tokenNumber         Int         @map("token_number")
  status              QueueStatus @default(WAITING)
  estimatedWaitMinutes Int?       @map("estimated_wait_minutes")
  calledAt            DateTime?   @map("called_at") @db.Timestamptz
  completedAt         DateTime?   @map("completed_at") @db.Timestamptz
  createdAt           DateTime    @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  doctor      User        @relation("DoctorQueueTokens", fields: [doctorId], references: [id], onDelete: Restrict)
  patient     User        @relation("PatientQueueTokens", fields: [patientId], references: [id], onDelete: Restrict)

  @@index([doctorId, status])
  @@index([doctorId, createdAt])
  @@map("queue_tokens")
}

// ------------------------------------------------------------
// 6. Medicine — Recurring medication schedule definition
// ------------------------------------------------------------
model Medicine {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  name         String    @db.VarChar(200)
  dosage       String    @db.VarChar(50)  // e.g. "500" or "10"
  unit         String    @db.VarChar(30)  // e.g. "mg", "ml", "tablets"
  frequency    Frequency
  timings      String[]  @db.VarChar(5)   // ["08:00", "14:00", "21:00"]
  startDate    DateTime  @map("start_date") @db.Date
  endDate      DateTime? @map("end_date") @db.Date
  instructions String?   @db.Text
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  medicationLogs MedicationLog[]

  @@index([userId, isActive])
  @@index([userId, startDate, endDate])
  @@map("medicines")
}

// ------------------------------------------------------------
// 7. MedicationLog — Individual dose-level adherence record
// ------------------------------------------------------------
model MedicationLog {
  id          String              @id @default(uuid()) @db.Uuid
  medicineId  String              @map("medicine_id") @db.Uuid
  userId      String              @map("user_id") @db.Uuid
  scheduledAt DateTime            @map("scheduled_at") @db.Timestamptz
  takenAt     DateTime?           @map("taken_at") @db.Timestamptz
  status      MedicationLogStatus @default(PENDING)
  snoozeUntil DateTime?           @map("snooze_until") @db.Timestamptz
  notes       String?             @db.Text
  createdAt   DateTime            @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([medicineId, scheduledAt], name: "uq_medicine_scheduled")
  @@index([userId, scheduledAt])
  @@index([userId, status])
  @@index([scheduledAt, status])
  @@map("medication_logs")
}

// ------------------------------------------------------------
// 8. Vital — Point-in-time health measurement
// ------------------------------------------------------------
model Vital {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  vitalType  VitalType @map("type")
  values     Json      @db.JsonB
  notes      String?   @db.Text
  recordedAt DateTime  @map("recorded_at") @db.Timestamptz
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, vitalType, recordedAt])
  @@index([userId, recordedAt])
  @@map("vitals")
}

// ------------------------------------------------------------
// 9. CaregiverLink — Permission-based caregiver-patient link
// ------------------------------------------------------------
model CaregiverLink {
  id           String   @id @default(uuid()) @db.Uuid
  caregiverId  String   @map("caregiver_id") @db.Uuid
  patientId    String   @map("patient_id") @db.Uuid
  relationship String   @db.VarChar(50) // "spouse", "child", "sibling", etc.
  permissions  String[] // ["VIEW_VITALS", "VIEW_MEDICATIONS", "VIEW_APPOINTMENTS", "BOOK_APPOINTMENTS", "RECEIVE_ALERTS"]
  status       CaregiverLinkStatus @default(PENDING)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  caregiver User @relation("CaregiverUser", fields: [caregiverId], references: [id], onDelete: Cascade)
  patient   User @relation("PatientUser", fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([caregiverId, patientId], name: "uq_caregiver_patient")
  @@index([patientId, status])
  @@map("caregiver_links")
}

// ------------------------------------------------------------
// 10. Notification — Multi-channel notification record
// ------------------------------------------------------------
model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(200)
  message   String           @db.Text
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at") @db.Timestamptz
  metadata  Json?            @db.JsonB
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, type, createdAt])
  @@index([createdAt])
  @@map("notifications")
}

// ------------------------------------------------------------
// 11. AuditLog — Immutable system-wide change log
// ------------------------------------------------------------
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  action    String   @db.VarChar(50) // "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity    String   @db.VarChar(50) // "User", "Appointment", etc.
  entityId  String   @map("entity_id") @db.VarChar(100)
  oldValues Json?    @map("old_values") @db.JsonB
  newValues Json?    @map("new_values") @db.JsonB
  ipAddress String?  @map("ip_address") @db.VarChar(45) // IPv6 max length
  userAgent String?  @map("user_agent") @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ------------------------------------------------------------
// 12. RefreshToken — JWT refresh token rotation tracking
// ------------------------------------------------------------
model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  isRevoked Boolean  @default(false) @map("is_revoked")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

// ------------------------------------------------------------
// 13. AnalyticsSnapshot — Nightly precomputed stats
// ------------------------------------------------------------
model AnalyticsSnapshot {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  date            DateTime @db.Date
  adherenceRate   Float    @map("adherence_rate")
  maxStreak       Int      @map("max_streak")
  currentStreak   Int      @map("current_streak")
  delayedDoses    Int      @map("delayed_doses")
  vitalsCount     Int      @map("vitals_count")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date], name: "uq_user_date")
  @@index([date])
  @@map("analytics_snapshots")
}

```

- `fullTextSearch` enables PostgreSQL-native `search` filters on `String` fields.
- `linux-musl-openssl-3.0.x` is included for Alpine-based Docker deployments.

---

## 3. Schema Conventions

| Convention | Rule | Example |
|---|---|---|
| **Primary Key** | UUID v4, generated by `@default(uuid())` | `id String @id @default(uuid())` |
| **Table Naming** | PascalCase model → snake_case table via `@@map` | `model User { ... @@map("users") }` |
| **Column Naming** | camelCase in Prisma, mapped to snake_case via `@map` | `firstName @map("first_name")` |
| **Timestamps** | Every mutable model has `createdAt` + `updatedAt` | `updatedAt DateTime @updatedAt` |
| **Soft Deletes** | Nullable `deletedAt` where applicable | `deletedAt DateTime?` |
| **Enums** | UPPER_SNAKE_CASE values, PascalCase enum name | `enum Role { PATIENT DOCTOR ... }` |
| **Relations** | Explicit FK fields, always named `<relation>Id` | `userId String` + `@relation(fields: [userId])` |
| **Indexes** | Declared via `@@index` with query-pattern comments | `@@index([scheduledDate])` |

---

## 4. Complete Prisma Schema

```prisma
// ============================================================
// SmartCare — Prisma Schema
// Database: PostgreSQL 17
// ============================================================

datasource db {
  provider = "postgresql"
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]
}

// ============================================================
// ENUMS
// ============================================================

enum Role {
  PATIENT
  DOCTOR
  CAREGIVER
  ADMIN

  @@map("role")
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY

  @@map("day_of_week")
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW

  @@map("appointment_status")
}

enum AppointmentType {
  IN_PERSON
  TELECONSULT

  @@map("appointment_type")
}

enum QueueStatus {
  WAITING
  IN_PROGRESS
  COMPLETED
  SKIPPED

  @@map("queue_status")
}

enum Frequency {
  DAILY
  TWICE_DAILY
  THRICE_DAILY
  WEEKLY
  AS_NEEDED
  CUSTOM

  @@map("frequency")
}

enum MedicationLogStatus {
  PENDING
  TAKEN
  SKIPPED
  MISSED
  SNOOZED

  @@map("medication_log_status")
}

enum VitalType {
  BLOOD_PRESSURE
  GLUCOSE
  PULSE
  WEIGHT
  TEMPERATURE
  OXYGEN_SATURATION

  @@map("vital_type")
}

enum NotificationType {
  MEDICATION_REMINDER
  APPOINTMENT_REMINDER
  VITAL_ALERT
  CAREGIVER_ALERT
  SYSTEM

  @@map("notification_type")
}

enum CaregiverLinkStatus {
  PENDING
  ACCEPTED
  REJECTED

  @@map("caregiver_link_status")
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED

  @@map("payment_status")
}

enum TokenType {
  RESET_PASSWORD
  VERIFY_EMAIL

  @@map("token_type")
}

// ============================================================
// MODELS
// ============================================================

// ------------------------------------------------------------
// 1. User — Central identity for all roles
// ------------------------------------------------------------
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         Role
  firstName    String    @map("first_name") @db.VarChar(100)
  lastName     String    @map("last_name") @db.VarChar(100)
  phone        String?   @db.VarChar(20)
  isVerified   Boolean   @default(false) @map("is_verified")
  isActive     Boolean   @default(true) @map("is_active")
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  doctorProfile         DoctorProfile?
  appointmentsAsPatient Appointment[]       @relation("PatientAppointments")
  appointmentsAsDoctor  Appointment[]       @relation("DoctorAppointments")
  queueTokensAsDoctor   QueueToken[]        @relation("DoctorQueueTokens")
  queueTokensAsPatient  QueueToken[]        @relation("PatientQueueTokens")
  medicines             Medicine[]
  medicationLogs        MedicationLog[]
  vitals                Vital[]
  caregiverLinks        CaregiverLink[]     @relation("CaregiverUser")
  patientLinks          CaregiverLink[]     @relation("PatientUser")
  notifications         Notification[]
  auditLogs             AuditLog[]
  refreshTokens         RefreshToken[]
  analyticsSnapshots    AnalyticsSnapshot[]
  verificationTokens    VerificationToken[]
  payments              Payment[]
  medicalRecords        MedicalRecord[]

  @@index([email])
  @@index([role])
  @@index([isActive, deletedAt])
  @@map("users")
}

// ------------------------------------------------------------
// 2. DoctorProfile — Extended profile for DOCTOR users
// ------------------------------------------------------------
model DoctorProfile {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @unique @map("user_id") @db.Uuid
  specialization         String   @db.VarChar(150)
  clinicName             String   @map("clinic_name") @db.VarChar(200)
  clinicAddress          String?  @map("clinic_address") @db.Text
  consultationFee        Decimal  @map("consultation_fee") @db.Decimal(10, 2)
  avgConsultationMinutes Int      @default(15) @map("avg_consultation_minutes")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user         User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  availability DoctorAvailability[]
  appointments Appointment[]

  @@index([specialization])
  @@map("doctor_profiles")
}

// ------------------------------------------------------------
// 3. DoctorAvailability — Weekly recurring slot definitions
// ------------------------------------------------------------
model DoctorAvailability {
  id              String    @id @default(uuid()) @db.Uuid
  doctorProfileId String    @map("doctor_profile_id") @db.Uuid
  dayOfWeek       DayOfWeek @map("day_of_week")
  startTime       String    @map("start_time") @db.VarChar(5) // "09:00"
  endTime         String    @map("end_time") @db.VarChar(5) // "17:00"
  maxPatients     Int       @default(20) @map("max_patients")
  isActive        Boolean   @default(true) @map("is_active")

  // --- Relations ---
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Cascade)

  @@unique([doctorProfileId, dayOfWeek, startTime], name: "uq_doctor_day_slot")
  @@index([doctorProfileId, isActive])
  @@map("doctor_availability")
}

// ------------------------------------------------------------
// 4. Appointment — Scheduled visit between patient and doctor
// ------------------------------------------------------------
model Appointment {
  id              String            @id @default(uuid()) @db.Uuid
  patientId       String            @map("patient_id") @db.Uuid
  doctorId        String            @map("doctor_id") @db.Uuid
  doctorProfileId String            @map("doctor_profile_id") @db.Uuid
  scheduledDate   DateTime          @map("scheduled_date") @db.Date
  slotStart       DateTime          @map("slot_start") @db.Timestamptz
  slotEnd         DateTime          @map("slot_end") @db.Timestamptz
  tokenNumber     Int               @map("token_number")
  status          AppointmentStatus @default(PENDING)
  type            AppointmentType   @default(IN_PERSON)
  notes           String?           @db.Text
  clinicalNotes   String?           @map("clinical_notes") @db.Text
  prescription    String?           @db.Text
  meetingUrl      String?           @map("meeting_url") @db.VarChar(500)
  cancelReason    String?           @map("cancel_reason") @db.Text
  cancelledBy     String?           @map("cancelled_by") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  patient       User          @relation("PatientAppointments", fields: [patientId], references: [id], onDelete: Restrict)
  doctor        User          @relation("DoctorAppointments", fields: [doctorId], references: [id], onDelete: Restrict)
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Restrict)
  queueToken    QueueToken?
  payment       Payment?

  @@unique([doctorId, scheduledDate, tokenNumber], name: "uq_doctor_date_token")
  @@index([patientId, status])
  @@index([doctorId, scheduledDate])
  @@index([scheduledDate, status])
  @@index([status])
  @@map("appointments")
}

// ------------------------------------------------------------
// 5. QueueToken — Real-time queue position for an appointment
// ------------------------------------------------------------
model QueueToken {
  id                   String      @id @default(uuid()) @db.Uuid
  appointmentId        String      @unique @map("appointment_id") @db.Uuid
  doctorId             String      @map("doctor_id") @db.Uuid
  patientId            String      @map("patient_id") @db.Uuid
  tokenNumber          Int         @map("token_number")
  status               QueueStatus @default(WAITING)
  estimatedWaitMinutes Int?        @map("estimated_wait_minutes")
  calledAt             DateTime?   @map("called_at") @db.Timestamptz
  completedAt          DateTime?   @map("completed_at") @db.Timestamptz
  createdAt            DateTime    @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  doctor      User        @relation("DoctorQueueTokens", fields: [doctorId], references: [id], onDelete: Restrict)
  patient     User        @relation("PatientQueueTokens", fields: [patientId], references: [id], onDelete: Restrict)

  @@index([doctorId, status])
  @@index([doctorId, createdAt])
  @@map("queue_tokens")
}

// ------------------------------------------------------------
// 6. Medicine — Recurring medication schedule definition
// ------------------------------------------------------------
model Medicine {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  name         String    @db.VarChar(200)
  dosage       String    @db.VarChar(50) // e.g. "500" or "10"
  unit         String    @db.VarChar(30) // e.g. "mg", "ml", "tablets"
  frequency    Frequency
  timings      String[]  @db.VarChar(5) // ["08:00", "14:00", "21:00"]
  startDate    DateTime  @map("start_date") @db.Date
  endDate      DateTime? @map("end_date") @db.Date
  instructions String?   @db.Text
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  medicationLogs MedicationLog[]

  @@index([userId, isActive])
  @@index([userId, startDate, endDate])
  @@map("medicines")
}

// ------------------------------------------------------------
// 7. MedicationLog — Individual dose-level adherence record
// ------------------------------------------------------------
model MedicationLog {
  id          String              @id @default(uuid()) @db.Uuid
  medicineId  String              @map("medicine_id") @db.Uuid
  userId      String              @map("user_id") @db.Uuid
  scheduledAt DateTime            @map("scheduled_at") @db.Timestamptz
  takenAt     DateTime?           @map("taken_at") @db.Timestamptz
  status      MedicationLogStatus @default(PENDING)
  snoozeUntil DateTime?           @map("snooze_until") @db.Timestamptz
  notes       String?             @db.Text
  deletedAt   DateTime?           @map("deleted_at") @db.Timestamptz
  createdAt   DateTime            @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([medicineId, scheduledAt], name: "uq_medicine_scheduled")
  @@index([userId, scheduledAt])
  @@index([userId, status])
  @@index([scheduledAt, status])
  @@map("medication_logs")
}

// ------------------------------------------------------------
// 8. Vital — Point-in-time health measurement
// ------------------------------------------------------------
model Vital {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  vitalType  VitalType @map("type")
  values     Json      @db.JsonB
  notes      String?   @db.Text
  recordedAt DateTime  @map("recorded_at") @db.Timestamptz
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([userId, vitalType, recordedAt])
  @@index([userId, recordedAt])
  @@map("vitals")
}

// ------------------------------------------------------------
// 9. CaregiverLink — Permission-based caregiver-patient link
// ------------------------------------------------------------
model CaregiverLink {
  id           String              @id @default(uuid()) @db.Uuid
  caregiverId  String              @map("caregiver_id") @db.Uuid
  patientId    String              @map("patient_id") @db.Uuid
  relationship String              @db.VarChar(50) // "spouse", "child", "sibling", etc.
  permissions  String[] // ["VIEW_VITALS", "VIEW_MEDICATIONS", "VIEW_APPOINTMENTS", "BOOK_APPOINTMENTS", "RECEIVE_ALERTS"]
  status       CaregiverLinkStatus @default(PENDING)
  createdAt    DateTime            @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime            @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  caregiver User @relation("CaregiverUser", fields: [caregiverId], references: [id], onDelete: Cascade)
  patient   User @relation("PatientUser", fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([caregiverId, patientId], name: "uq_caregiver_patient")
  @@index([patientId, status])
  @@map("caregiver_links")
}

// ------------------------------------------------------------
// 10. Notification — Multi-channel notification record
// ------------------------------------------------------------
model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(200)
  message   String           @db.Text
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at") @db.Timestamptz
  metadata  Json?            @db.JsonB
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, type, createdAt])
  @@index([createdAt])
  @@map("notifications")
}

// ------------------------------------------------------------
// 11. AuditLog — Immutable system-wide change log
// ------------------------------------------------------------
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  action    String   @db.VarChar(50) // "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity    String   @db.VarChar(50) // "User", "Appointment", etc.
  entityId  String   @map("entity_id") @db.VarChar(100)
  oldValues Json?    @map("old_values") @db.JsonB
  newValues Json?    @map("new_values") @db.JsonB
  ipAddress String?  @map("ip_address") @db.VarChar(45) // IPv6 max length
  userAgent String?  @map("user_agent") @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@index([createdAt])
  @@index([newValues(ops: JsonbPathOps)], type: Gin)
  @@index([oldValues(ops: JsonbPathOps)], type: Gin)
  @@map("audit_logs")
}

// ------------------------------------------------------------
// 12. RefreshToken — JWT refresh token rotation tracking
// ------------------------------------------------------------
model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  isRevoked Boolean  @default(false) @map("is_revoked")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

// ------------------------------------------------------------
// 13. AnalyticsSnapshot — Nightly precomputed stats
// ------------------------------------------------------------
model AnalyticsSnapshot {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  date          DateTime @db.Date
  adherenceRate Float    @map("adherence_rate")
  maxStreak     Int      @map("max_streak")
  currentStreak Int      @map("current_streak")
  delayedDoses  Int      @map("delayed_doses")
  vitalsCount   Int      @map("vitals_count")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date], name: "uq_user_date")
  @@index([date])
  @@map("analytics_snapshots")
}

// ------------------------------------------------------------
// 14. VerificationToken — Password reset and email verify tokens
// ------------------------------------------------------------
model VerificationToken {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  token     String    @unique
  type      TokenType
  expiresAt DateTime  @map("expires_at") @db.Timestamptz
  isUsed    Boolean   @default(false) @map("is_used")
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, type])
  @@index([token])
  @@map("verification_tokens")
}

// ------------------------------------------------------------
// 15. Payment — Cashfree payment integration
// ------------------------------------------------------------
model Payment {
  id               String        @id @default(uuid()) @db.Uuid
  appointmentId    String        @unique @map("appointment_id") @db.Uuid
  patientId        String        @map("patient_id") @db.Uuid
  amount           Decimal       @db.Decimal(10, 2)
  currency         String        @default("INR") @db.VarChar(10)
  status           PaymentStatus @default(PENDING)
  paymentSessionId String?       @map("payment_session_id") @db.VarChar(255)
  gatewayOrderId   String?       @map("gateway_order_id") @db.VarChar(255)
  createdAt        DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patient     User        @relation(fields: [patientId], references: [id], onDelete: Restrict)

  @@index([patientId])
  @@index([status])
  @@map("payments")
}

// ------------------------------------------------------------
// 16. MedicalRecord — Patient uploaded medical reports
// ------------------------------------------------------------
model MedicalRecord {
  id        String    @id @default(uuid()) @db.Uuid
  userId    String    @map("user_id") @db.Uuid
  name      String    @db.VarChar(200)
  fileUrl   String    @map("file_url") @db.VarChar(500)
  deletedAt DateTime? @map("deleted_at") @db.Timestamptz
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([userId])
  @@map("medical_records")
}

```

---

## 5. Model-by-Model Breakdown

### 5.1 User

The central identity model for all platform participants.

| Aspect | Detail |
|---|---|
| **Primary Key** | UUID v4 — avoids sequential ID enumeration attacks |
| **Soft Delete** | `deletedAt` nullable timestamp — records are never physically removed |
| **Role Enum** | Determines access via middleware RBAC checks |
| **`isVerified`** | Set to `true` after email/OTP verification flow |
| **`isActive`** | Admin-controlled kill switch independent of soft delete |

**Key Relationships:**
- **1:1** → `DoctorProfile` (only if `role === DOCTOR`)
- **1:N** → `Appointment` (appears as both `patient` and `doctor`)
- **1:N** → `Medicine`, `MedicationLog`, `Vital`, `Notification`, `AuditLog`, `RefreshToken`
- **M:N** → `CaregiverLink` (user can be both a caregiver and a patient in different links)

**Why two separate appointment relations?** A single `User` can be both a doctor (seeing patients) and a patient (seeing another doctor). The named relations (`PatientAppointments`, `DoctorAppointments`) disambiguate these at the Prisma level, generating correct SQL JOINs.

---

### 5.2 DoctorProfile

Extended professional information for users with `role = DOCTOR`.

| Aspect | Detail |
|---|---|
| **1:1 with User** | `userId` has `@unique` — enforced at DB level |
| **`consultationFee`** | `Decimal(10,2)` — cent-safe monetary storage |
| **`avgConsultationMinutes`** | Used by the queue engine to estimate wait times |
| **Cascade Delete** | If the User is deleted, the profile goes with it |

---

### 5.3 DoctorAvailability

Defines the weekly recurring slots during which a doctor accepts appointments.

| Aspect | Detail |
|---|---|
| **Composite Unique** | `(doctorProfileId, dayOfWeek, startTime)` — prevents duplicate slot definitions |
| **`startTime` / `endTime`** | Stored as `VarChar(5)` in `HH:mm` format (e.g., `"09:00"`) |
| **`maxPatients`** | Caps the number of appointments bookable in this time window |
| **`isActive`** | Allows doctors to temporarily disable a slot without deleting it |

**Design Decision:** Time strings rather than `DateTime` are used because these represent recurring weekly patterns, not specific instants. The application layer combines `dayOfWeek` + `startTime` with a concrete date to produce an actual `DateTime` for an `Appointment.slotStart`.

---

### 5.4 Appointment

The core scheduling entity linking patients to doctors.

| Aspect | Detail |
|---|---|
| **Three FKs** | `patientId → User`, `doctorId → User`, `doctorProfileId → DoctorProfile` |
| **`scheduledDate`** | `Date` type (no time component) — used for day-level queries |
| **`slotStart` / `slotEnd`** | `Timestamptz` — full timezone-aware timestamps for the exact window |
| **`tokenNumber`** | Sequential per doctor per day; compound unique with `doctorId + scheduledDate` |
| **`cancelledBy`** | UUID of the user who cancelled (can be patient, doctor, or admin) |
| **`onDelete: Restrict`** | Prevents deleting a User who has appointment history — must soft-delete instead |

**Status State Machine:**
```
PENDING → CONFIRMED → IN_PROGRESS → COMPLETED
    ↘         ↘              ↘
   CANCELLED  CANCELLED    NO_SHOW
```

---

### 5.5 QueueToken

Tracks real-time queue position for today's appointments; powering the live queue UI via Socket.IO.

| Aspect | Detail |
|---|---|
| **1:1 with Appointment** | `appointmentId` is `@unique` — each appointment gets at most one queue entry |
| **`estimatedWaitMinutes`** | Computed by: `tokensAhead × doctorProfile.avgConsultationMinutes` |
| **`calledAt`** | Set when doctor marks the token as `IN_PROGRESS` |
| **`completedAt`** | Set when status transitions to `COMPLETED` or `SKIPPED` |
| **No `updatedAt`** | Queue tokens are short-lived; status transitions are tracked by `calledAt`/`completedAt` |

**Queue Status Flow:**
```
WAITING → IN_PROGRESS → COMPLETED
    ↘                       ↗
   SKIPPED ────────────────
```

---

### 5.6 Medicine

Defines a recurring medication schedule for a patient.

| Aspect | Detail |
|---|---|
| **`timings` (String[])** | PostgreSQL array of `VarChar(5)` — e.g., `["08:00", "14:00", "21:00"]` |
| **`frequency`** | Enum controlling the recurrence pattern used by the BullMQ scheduler |
| **`startDate` / `endDate`** | `Date` type; `endDate` is nullable for indefinite medications |
| **`isActive`** | Soft toggle — deactivated medicines stop generating `MedicationLog` entries |

**How medication reminders work:**
1. A BullMQ repeatable job runs every 15 minutes.
2. It queries active medicines where `startDate ≤ today ≤ endDate` (or `endDate IS NULL`).
3. For each timing in `timings[]`, it creates a `MedicationLog` entry with `status = PENDING`.
4. A Redis-backed notification is dispatched via Socket.IO.

---

### 5.7 MedicationLog

Individual dose-level record representing one scheduled intake event.

| Aspect | Detail |
|---|---|
| **Compound Unique** | `(medicineId, scheduledAt)` — one log per medicine per scheduled time |
| **`takenAt`** | `null` until the patient marks the dose as `TAKEN` |
| **`snoozeUntil`** | If `status = SNOOZED`, the system re-sends the reminder at this time |
| **Adherence Calculation** | `adherence% = (TAKEN count / total count) × 100` over a date range |

**Status Transitions:**
```
PENDING → TAKEN    (patient taps "Take")
PENDING → SKIPPED  (patient taps "Skip")
PENDING → SNOOZED  (patient taps "Snooze" → re-enters PENDING after snoozeUntil)
PENDING → MISSED   (background job marks overdue PENDING logs as MISSED)
```

---

### 5.8 Vital

Point-in-time health measurements recorded by patients or caregivers.

| Aspect | Detail |
|---|---|
| **Polymorphic Value Columns** | Only the relevant columns are populated based on `type` |
| **`unit`** | Stores the measurement unit (application validates unit ↔ type pairing) |
| **`recordedAt`** | When the measurement was physically taken (may differ from `createdAt`) |

**Type-to-Column Mapping:**

| VitalType | Populated Columns |
|---|---|
| `BLOOD_PRESSURE` | `systolic`, `diastolic` |
| `GLUCOSE` | `glucoseLevel` |
| `PULSE` | `pulseRate` |
| `WEIGHT` | `weight` |
| `TEMPERATURE` | `temperature` |
| `OXYGEN_SATURATION` | `oxygenSaturation` |

**Design Decision:** A single `Vital` table with nullable columns was chosen over separate tables per vital type. The trade-off is some null columns, but it simplifies timeline queries ("show me all vitals for patient X in the last 30 days") and avoids excessive JOINs. Application-layer Zod validators enforce that the correct columns are present for each `type`.

---

### 5.9 CaregiverLink

A permission-based connection between a caregiver and the patient they monitor.

| Aspect | Detail |
|---|---|
| **Compound Unique** | `(caregiverId, patientId)` — one link per caregiver-patient pair |
| **`permissions` (String[])** | Array of permission strings like `"VIEW_VITALS"`, `"VIEW_MEDICATIONS"` |
| **`relationship`** | Human-readable label: `"spouse"`, `"child"`, `"parent"`, `"sibling"` |
| **`isActive`** | Allows revocation without deleting the link history |

**Permission values used by middleware:**
- `VIEW_VITALS` — read patient's vital records
- `VIEW_MEDICATIONS` — read patient's medicines and logs
- `VIEW_APPOINTMENTS` — read patient's appointment history
- `RECEIVE_ALERTS` — receive caregiver alert notifications

---

### 5.10 Notification

Stores all push/in-app notifications sent to users.

| Aspect | Detail |
|---|---|
| **`metadata` (JsonB)** | Flexible payload — e.g., `{ appointmentId: "...", doctorName: "..." }` |
| **`isRead` + `readAt`** | Dual tracking — boolean for fast filtering, timestamp for analytics |
| **No `updatedAt`** | Notifications are immutable after creation (only `isRead`/`readAt` change) |

**Notification Pipeline:**
1. Service layer emits event → BullMQ notification queue.
2. Worker creates the `Notification` row.
3. Socket.IO pushes the payload to the connected client in real time.
4. Unread badge count is recalculated via `WHERE isRead = false AND userId = ?`.

---

### 5.11 AuditLog

Immutable, append-only ledger of all significant system actions.

| Aspect | Detail |
|---|---|
| **`userId` nullable** | System-initiated actions (cron jobs, workers) have no user context |
| **`oldValues` / `newValues`** | JsonB snapshots of the entity before/after the change |
| **`ipAddress`** | `VarChar(45)` accommodates IPv6 addresses |
| **`onDelete: SetNull`** | If a user is hard-deleted, audit records survive with `userId = NULL` |
| **No `updatedAt`** | Audit logs are immutable — they must never be modified |

**What gets audited:**
- User login / logout
- Appointment create / update / cancel
- Medicine create / update / deactivate
- Vital create
- Role changes
- Admin actions (user activation, verification overrides)

---

### 5.12 RefreshToken

Tracks JWT refresh tokens for secure token rotation.

| Aspect | Detail |
|---|---|
| **`token` unique** | Indexed for fast lookup during token refresh |
| **`isRevoked`** | Set to `true` on logout, password change, or rotation |
| **`expiresAt`** | Used by a scheduled cleanup job to purge expired tokens |
| **Cascade Delete** | If the user is deleted, all their tokens are invalidated |

**Token Rotation Flow:**
1. Client sends expired access token + valid refresh token.
2. Server verifies refresh token exists, is not revoked, and is not expired.
3. Server marks old refresh token as `isRevoked = true`.
4. Server issues new access token + new refresh token pair.
5. If a revoked token is reused → **all tokens for that user are revoked** (reuse detection).

---

## 6. Entity-Relationship Diagram

```
┌──────────────┐       1:1        ┌─────────────────┐       1:N       ┌─────────────────────┐
│     User     │─────────────────▶│  DoctorProfile   │───────────────▶│  DoctorAvailability  │
│              │                  │                  │                └─────────────────────┘
│  id (PK)     │                  │  id (PK)         │
│  email       │                  │  userId (FK,UQ)  │       1:N       ┌─────────────────┐
│  role        │                  │  specialization  │───────────────▶│   Appointment    │
└──────┬───────┘                  └──────────────────┘                └────────┬────────┘
       │                                                                       │
       │  1:N (as patient)          1:N (as doctor)                           │ 1:1
       ├────────────────────────▶  Appointment  ◀──────────────────────┘      │
       │                                                                       ▼
       │                                                              ┌───────────────┐
       │                                                              │  QueueToken   │
       │                                                              └───────────────┘
       │
       ├──── 1:N ──▶  Medicine ──── 1:N ──▶  MedicationLog
       │
       ├──── 1:N ──▶  Vital
       │
       ├──── M:N ──▶  CaregiverLink  (as caregiver OR patient)
       │
       ├──── 1:N ──▶  Notification
       │
       ├──── 1:N ──▶  AuditLog
       │
       └──── 1:N ──▶  RefreshToken
```

---

## 7. Index Justifications

Every `@@index` in the schema is justified by a concrete query pattern:

| Model | Index | Query Pattern |
|---|---|---|
| **User** | `[email]` | Login lookup — `WHERE email = ?` |
| **User** | `[role]` | Admin dashboard — list all doctors, list all patients |
| **User** | `[isActive, deletedAt]` | Filter soft-deleted / deactivated users from all queries |
| **DoctorProfile** | `[specialization]` | Patient search — "find a cardiologist" |
| **DoctorAvailability** | `[doctorProfileId, isActive]` | Load active slots for a specific doctor |
| **Appointment** | `[patientId, status]` | Patient dashboard — "my upcoming appointments" |
| **Appointment** | `[doctorId, scheduledDate]` | Doctor dashboard — "today's appointment list" |
| **Appointment** | `[scheduledDate, status]` | Admin reports — appointments per day by status |
| **Appointment** | `[status]` | Background job — find all PENDING appointments for reminder dispatch |
| **QueueToken** | `[doctorId, status]` | Live queue display — "WAITING tokens for Dr. X" |
| **QueueToken** | `[doctorId, createdAt]` | Queue ordering — tokens for today in creation order |
| **Medicine** | `[userId, isActive]` | Patient medicine list — "my active medications" |
| **Medicine** | `[userId, startDate, endDate]` | BullMQ scheduler — find active medicines for today |
| **MedicationLog** | `[userId, scheduledAt]` | Daily timeline — "doses scheduled for today" |
| **MedicationLog** | `[userId, status]` | Adherence calc — count TAKEN vs total for a patient |
| **MedicationLog** | `[scheduledAt, status]` | Background job — mark overdue PENDING as MISSED |
| **Vital** | `[userId, type, recordedAt]` | Chart data — "BP readings for patient X, last 90 days" |
| **Vital** | `[userId, recordedAt]` | Unified timeline — "all vitals for patient X, last 30 days" |
| **CaregiverLink** | `[patientId, isActive]` | Caregiver alert dispatch — "who monitors this patient?" |
| **Notification** | `[userId, isRead]` | Unread badge count — `WHERE userId = ? AND isRead = false` |
| **Notification** | `[userId, type, createdAt]` | Filtered notification list — "my medication reminders" |
| **Notification** | `[createdAt]` | Admin/cleanup — purge notifications older than 90 days |
| **AuditLog** | `[userId, createdAt]` | Admin investigation — "what did user X do?" |
| **AuditLog** | `[entity, entityId]` | Entity history — "all changes to Appointment abc-123" |
| **AuditLog** | `[createdAt]` | Retention policy — archive/purge old audit records |
| **RefreshToken** | `[userId, isRevoked]` | Revoke all tokens — `WHERE userId = ? AND isRevoked = false` |
| **RefreshToken** | `[expiresAt]` | Cleanup job — `DELETE WHERE expiresAt < NOW()` |

---

## 8. Prisma Client Generation Notes

### Installation

```bash
npm install prisma --save-dev
npm install @prisma/client
```

### Generate Client

```bash
npx prisma generate
```

This creates a type-safe client at `node_modules/.prisma/client`. Import it as:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

export default prisma;
```

### Singleton Pattern (for Express)

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances during hot-reload in development
  var __prisma: PrismaClient | undefined;
}

const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export default prisma;
```

### Soft Delete Middleware

```typescript
// src/middleware/prisma-soft-delete.ts
import { Prisma } from '@prisma/client';

// Automatically exclude soft-deleted users from queries
prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }
  }
  return next(params);
});
```

---

## 9. Seed Data Strategy

### File Location

```
prisma/
├── schema.prisma
└── seed.ts
```

### Package.json Configuration

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"commonjs\"} prisma/seed.ts"
  }
}
```

### Seed Script Structure

```typescript
// prisma/seed.ts
import { PrismaClient, Role, Frequency, DayOfWeek } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- 1. Admin User ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartcare.dev' },
    update: {},
    create: {
      email: 'admin@smartcare.dev',
      passwordHash: await bcrypt.hash('Admin@123', 12),
      role: Role.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
      phone: '+919999900000',
      isVerified: true,
      isActive: true,
    },
  });

  // --- 2. Doctor User + Profile + Availability ---
  const doctor = await prisma.user.upsert({
    where: { email: 'dr.sharma@smartcare.dev' },
    update: {},
    create: {
      email: 'dr.sharma@smartcare.dev',
      passwordHash: await bcrypt.hash('Doctor@123', 12),
      role: Role.DOCTOR,
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+919999900001',
      isVerified: true,
      isActive: true,
      doctorProfile: {
        create: {
          specialization: 'Cardiology',
          clinicName: 'HeartCare Clinic',
          clinicAddress: '42 MG Road, Bangalore 560001',
          consultationFee: 500.00,
          avgConsultationMinutes: 15,
          availability: {
            createMany: {
              data: [
                { dayOfWeek: DayOfWeek.MONDAY,    startTime: '09:00', endTime: '13:00', maxPatients: 20 },
                { dayOfWeek: DayOfWeek.MONDAY,    startTime: '15:00', endTime: '18:00', maxPatients: 12 },
                { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '13:00', maxPatients: 20 },
                { dayOfWeek: DayOfWeek.FRIDAY,    startTime: '09:00', endTime: '13:00', maxPatients: 20 },
              ],
            },
          },
        },
      },
    },
  });

  // --- 3. Patient User + Medicines ---
  const patient = await prisma.user.upsert({
    where: { email: 'rahul.kumar@gmail.com' },
    update: {},
    create: {
      email: 'rahul.kumar@gmail.com',
      passwordHash: await bcrypt.hash('Patient@123', 12),
      role: Role.PATIENT,
      firstName: 'Rahul',
      lastName: 'Kumar',
      phone: '+919999900002',
      isVerified: true,
      isActive: true,
      medicines: {
        create: [
          {
            name: 'Amlodipine',
            dosage: '5',
            unit: 'mg',
            frequency: Frequency.DAILY,
            timings: ['08:00'],
            startDate: new Date('2026-01-01'),
            instructions: 'Take with water on an empty stomach',
          },
          {
            name: 'Metformin',
            dosage: '500',
            unit: 'mg',
            frequency: Frequency.TWICE_DAILY,
            timings: ['08:00', '20:00'],
            startDate: new Date('2026-01-01'),
            instructions: 'Take after meals',
          },
        ],
      },
    },
  });

  // --- 4. Caregiver User + Link ---
  const caregiver = await prisma.user.upsert({
    where: { email: 'anita.kumar@gmail.com' },
    update: {},
    create: {
      email: 'anita.kumar@gmail.com',
      passwordHash: await bcrypt.hash('Caregiver@123', 12),
      role: Role.CAREGIVER,
      firstName: 'Anita',
      lastName: 'Kumar',
      phone: '+919999900003',
      isVerified: true,
      isActive: true,
    },
  });

  await prisma.caregiverLink.upsert({
    where: {
      uq_caregiver_patient: {
        caregiverId: caregiver.id,
        patientId: patient.id,
      },
    },
    update: {},
    create: {
      caregiverId: caregiver.id,
      patientId: patient.id,
      relationship: 'spouse',
      permissions: ['VIEW_VITALS', 'VIEW_MEDICATIONS', 'VIEW_APPOINTMENTS', 'RECEIVE_ALERTS'],
    },
  });

  console.log('✅ Seed data created successfully');
  console.log({
    admin: admin.email,
    doctor: doctor.email,
    patient: patient.email,
    caregiver: caregiver.email,
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Run Seed

```bash
npx prisma db seed
```

---

## 10. Migration Workflow

### Initial Setup

```bash
# 1. Create the database (if not exists)
createdb smartcare_dev

# 2. Set DATABASE_URL in .env
echo 'DATABASE_URL="postgresql://postgres:password@localhost:5432/smartcare_dev?schema=public"' > .env

# 3. Run the first migration
npx prisma migrate dev --name init

# 4. Seed the database
npx prisma db seed
```

### Development Workflow

```bash
# After schema changes:
npx prisma migrate dev --name describe_the_change

# Reset database (drops all data):
npx prisma migrate reset

# View current migration status:
npx prisma migrate status

# Open Prisma Studio (visual DB browser):
npx prisma studio
```

### Production Deployment

```bash
# Apply pending migrations (non-interactive):
npx prisma migrate deploy

# Generate client (must run after deploy):
npx prisma generate
```

### Migration Best Practices

| Practice | Rationale |
|---|---|
| **Never edit applied migrations** | Prisma tracks migration checksums; editing breaks the chain |
| **Use descriptive migration names** | `--name add_oxygen_saturation_to_vitals` not `--name update` |
| **Review generated SQL** | Always inspect `prisma/migrations/*/migration.sql` before applying |
| **Test migrations on staging first** | Use a staging database that mirrors production schema |
| **Back up before production migrate** | `pg_dump smartcare_prod > backup_$(date +%Y%m%d).sql` |
| **Handle data migrations separately** | Schema migrations via Prisma; data migrations via custom scripts |
| **Add indexes concurrently in prod** | For large tables, use raw SQL with `CREATE INDEX CONCURRENTLY` |

### Environment-Specific DATABASE_URL

```bash
# Development
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartcare_dev?schema=public"

# Test
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartcare_test?schema=public"

# Production (with connection pooling)
DATABASE_URL="postgresql://user:pass@pgbouncer.host:6432/smartcare_prod?schema=public&pgbouncer=true&connection_limit=1"

# Direct URL for migrations (bypasses PgBouncer)
DIRECT_URL="postgresql://user:pass@db.host:5432/smartcare_prod?schema=public"
```

When using PgBouncer in production, update the datasource:

```prisma
// ============================================================
// SmartCare — Prisma Schema
// Database: PostgreSQL 17
// ============================================================

datasource db {
  provider = "postgresql"
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
  binaryTargets   = ["native", "linux-musl-openssl-3.0.x"]
}

// ============================================================
// ENUMS
// ============================================================

enum Role {
  PATIENT
  DOCTOR
  CAREGIVER
  ADMIN

  @@map("role")
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY

  @@map("day_of_week")
}

enum AppointmentStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW

  @@map("appointment_status")
}

enum AppointmentType {
  IN_PERSON
  TELECONSULT

  @@map("appointment_type")
}

enum QueueStatus {
  WAITING
  IN_PROGRESS
  COMPLETED
  SKIPPED

  @@map("queue_status")
}

enum Frequency {
  DAILY
  TWICE_DAILY
  THRICE_DAILY
  WEEKLY
  AS_NEEDED
  CUSTOM

  @@map("frequency")
}

enum MedicationLogStatus {
  PENDING
  TAKEN
  SKIPPED
  MISSED
  SNOOZED

  @@map("medication_log_status")
}

enum VitalType {
  BLOOD_PRESSURE
  GLUCOSE
  PULSE
  WEIGHT
  TEMPERATURE
  OXYGEN_SATURATION

  @@map("vital_type")
}

enum NotificationType {
  MEDICATION_REMINDER
  APPOINTMENT_REMINDER
  VITAL_ALERT
  CAREGIVER_ALERT
  SYSTEM

  @@map("notification_type")
}

enum CaregiverLinkStatus {
  PENDING
  ACCEPTED
  REJECTED

  @@map("caregiver_link_status")
}

// ============================================================
// MODELS
// ============================================================

// ------------------------------------------------------------
// 1. User — Central identity for all roles
// ------------------------------------------------------------
model User {
  id           String    @id @default(uuid()) @db.Uuid
  email        String    @unique
  passwordHash String    @map("password_hash")
  role         Role
  firstName    String    @map("first_name") @db.VarChar(100)
  lastName     String    @map("last_name") @db.VarChar(100)
  phone        String?   @db.VarChar(20)
  isVerified   Boolean   @default(false) @map("is_verified")
  isActive     Boolean   @default(true) @map("is_active")
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  doctorProfile         DoctorProfile?
  appointmentsAsPatient Appointment[]    @relation("PatientAppointments")
  appointmentsAsDoctor  Appointment[]    @relation("DoctorAppointments")
  queueTokensAsDoctor   QueueToken[]     @relation("DoctorQueueTokens")
  queueTokensAsPatient  QueueToken[]     @relation("PatientQueueTokens")
  medicines             Medicine[]
  medicationLogs        MedicationLog[]
  vitals                Vital[]
  caregiverLinks        CaregiverLink[]  @relation("CaregiverUser")
  patientLinks          CaregiverLink[]  @relation("PatientUser")
  notifications         Notification[]
  auditLogs             AuditLog[]
  refreshTokens         RefreshToken[]
  analyticsSnapshots    AnalyticsSnapshot[]

  @@index([email])
  @@index([role])
  @@index([isActive, deletedAt])
  @@map("users")
}

// ------------------------------------------------------------
// 2. DoctorProfile — Extended profile for DOCTOR users
// ------------------------------------------------------------
model DoctorProfile {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @unique @map("user_id") @db.Uuid
  specialization         String   @db.VarChar(150)
  clinicName             String   @map("clinic_name") @db.VarChar(200)
  clinicAddress          String?  @map("clinic_address") @db.Text
  consultationFee        Decimal  @map("consultation_fee") @db.Decimal(10, 2)
  avgConsultationMinutes Int      @default(15) @map("avg_consultation_minutes")
  createdAt              DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt              DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user          User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  availability  DoctorAvailability[]
  appointments  Appointment[]

  @@index([specialization])
  @@map("doctor_profiles")
}

// ------------------------------------------------------------
// 3. DoctorAvailability — Weekly recurring slot definitions
// ------------------------------------------------------------
model DoctorAvailability {
  id              String    @id @default(uuid()) @db.Uuid
  doctorProfileId String    @map("doctor_profile_id") @db.Uuid
  dayOfWeek       DayOfWeek @map("day_of_week")
  startTime       String    @map("start_time") @db.VarChar(5) // "09:00"
  endTime         String    @map("end_time") @db.VarChar(5)   // "17:00"
  maxPatients     Int       @default(20) @map("max_patients")
  isActive        Boolean   @default(true) @map("is_active")

  // --- Relations ---
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Cascade)

  @@unique([doctorProfileId, dayOfWeek, startTime], name: "uq_doctor_day_slot")
  @@index([doctorProfileId, isActive])
  @@map("doctor_availability")
}

// ------------------------------------------------------------
// 4. Appointment — Scheduled visit between patient and doctor
// ------------------------------------------------------------
model Appointment {
  id              String            @id @default(uuid()) @db.Uuid
  patientId       String            @map("patient_id") @db.Uuid
  doctorId        String            @map("doctor_id") @db.Uuid
  doctorProfileId String            @map("doctor_profile_id") @db.Uuid
  scheduledDate   DateTime          @map("scheduled_date") @db.Date
  slotStart       DateTime          @map("slot_start") @db.Timestamptz
  slotEnd         DateTime          @map("slot_end") @db.Timestamptz
  tokenNumber     Int               @map("token_number")
  status          AppointmentStatus @default(PENDING)
  type            AppointmentType   @default(IN_PERSON)
  notes           String?           @db.Text
  cancelReason    String?           @map("cancel_reason") @db.Text
  cancelledBy     String?           @map("cancelled_by") @db.Uuid
  createdAt       DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  patient       User          @relation("PatientAppointments", fields: [patientId], references: [id], onDelete: Restrict)
  doctor        User          @relation("DoctorAppointments", fields: [doctorId], references: [id], onDelete: Restrict)
  doctorProfile DoctorProfile @relation(fields: [doctorProfileId], references: [id], onDelete: Restrict)
  queueToken    QueueToken?

  @@unique([doctorId, scheduledDate, tokenNumber], name: "uq_doctor_date_token")
  @@index([patientId, status])
  @@index([doctorId, scheduledDate])
  @@index([scheduledDate, status])
  @@index([status])
  @@map("appointments")
}

// ------------------------------------------------------------
// 5. QueueToken — Real-time queue position for an appointment
// ------------------------------------------------------------
model QueueToken {
  id                  String      @id @default(uuid()) @db.Uuid
  appointmentId       String      @unique @map("appointment_id") @db.Uuid
  doctorId            String      @map("doctor_id") @db.Uuid
  patientId           String      @map("patient_id") @db.Uuid
  tokenNumber         Int         @map("token_number")
  status              QueueStatus @default(WAITING)
  estimatedWaitMinutes Int?       @map("estimated_wait_minutes")
  calledAt            DateTime?   @map("called_at") @db.Timestamptz
  completedAt         DateTime?   @map("completed_at") @db.Timestamptz
  createdAt           DateTime    @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  appointment Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  doctor      User        @relation("DoctorQueueTokens", fields: [doctorId], references: [id], onDelete: Restrict)
  patient     User        @relation("PatientQueueTokens", fields: [patientId], references: [id], onDelete: Restrict)

  @@index([doctorId, status])
  @@index([doctorId, createdAt])
  @@map("queue_tokens")
}

// ------------------------------------------------------------
// 6. Medicine — Recurring medication schedule definition
// ------------------------------------------------------------
model Medicine {
  id           String    @id @default(uuid()) @db.Uuid
  userId       String    @map("user_id") @db.Uuid
  name         String    @db.VarChar(200)
  dosage       String    @db.VarChar(50)  // e.g. "500" or "10"
  unit         String    @db.VarChar(30)  // e.g. "mg", "ml", "tablets"
  frequency    Frequency
  timings      String[]  @db.VarChar(5)   // ["08:00", "14:00", "21:00"]
  startDate    DateTime  @map("start_date") @db.Date
  endDate      DateTime? @map("end_date") @db.Date
  instructions String?   @db.Text
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  medicationLogs MedicationLog[]

  @@index([userId, isActive])
  @@index([userId, startDate, endDate])
  @@map("medicines")
}

// ------------------------------------------------------------
// 7. MedicationLog — Individual dose-level adherence record
// ------------------------------------------------------------
model MedicationLog {
  id          String              @id @default(uuid()) @db.Uuid
  medicineId  String              @map("medicine_id") @db.Uuid
  userId      String              @map("user_id") @db.Uuid
  scheduledAt DateTime            @map("scheduled_at") @db.Timestamptz
  takenAt     DateTime?           @map("taken_at") @db.Timestamptz
  status      MedicationLogStatus @default(PENDING)
  snoozeUntil DateTime?           @map("snooze_until") @db.Timestamptz
  notes       String?             @db.Text
  createdAt   DateTime            @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  medicine Medicine @relation(fields: [medicineId], references: [id], onDelete: Cascade)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([medicineId, scheduledAt], name: "uq_medicine_scheduled")
  @@index([userId, scheduledAt])
  @@index([userId, status])
  @@index([scheduledAt, status])
  @@map("medication_logs")
}

// ------------------------------------------------------------
// 8. Vital — Point-in-time health measurement
// ------------------------------------------------------------
model Vital {
  id         String    @id @default(uuid()) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  vitalType  VitalType @map("type")
  values     Json      @db.JsonB
  notes      String?   @db.Text
  recordedAt DateTime  @map("recorded_at") @db.Timestamptz
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, vitalType, recordedAt])
  @@index([userId, recordedAt])
  @@map("vitals")
}

// ------------------------------------------------------------
// 9. CaregiverLink — Permission-based caregiver-patient link
// ------------------------------------------------------------
model CaregiverLink {
  id           String   @id @default(uuid()) @db.Uuid
  caregiverId  String   @map("caregiver_id") @db.Uuid
  patientId    String   @map("patient_id") @db.Uuid
  relationship String   @db.VarChar(50) // "spouse", "child", "sibling", etc.
  permissions  String[] // ["VIEW_VITALS", "VIEW_MEDICATIONS", "VIEW_APPOINTMENTS", "BOOK_APPOINTMENTS", "RECEIVE_ALERTS"]
  status       CaregiverLinkStatus @default(PENDING)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // --- Relations ---
  caregiver User @relation("CaregiverUser", fields: [caregiverId], references: [id], onDelete: Cascade)
  patient   User @relation("PatientUser", fields: [patientId], references: [id], onDelete: Cascade)

  @@unique([caregiverId, patientId], name: "uq_caregiver_patient")
  @@index([patientId, status])
  @@map("caregiver_links")
}

// ------------------------------------------------------------
// 10. Notification — Multi-channel notification record
// ------------------------------------------------------------
model Notification {
  id        String           @id @default(uuid()) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  title     String           @db.VarChar(200)
  message   String           @db.Text
  isRead    Boolean          @default(false) @map("is_read")
  readAt    DateTime?        @map("read_at") @db.Timestamptz
  metadata  Json?            @db.JsonB
  createdAt DateTime         @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, type, createdAt])
  @@index([createdAt])
  @@map("notifications")
}

// ------------------------------------------------------------
// 11. AuditLog — Immutable system-wide change log
// ------------------------------------------------------------
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String?  @map("user_id") @db.Uuid
  action    String   @db.VarChar(50) // "CREATE", "UPDATE", "DELETE", "LOGIN"
  entity    String   @db.VarChar(50) // "User", "Appointment", etc.
  entityId  String   @map("entity_id") @db.VarChar(100)
  oldValues Json?    @map("old_values") @db.JsonB
  newValues Json?    @map("new_values") @db.JsonB
  ipAddress String?  @map("ip_address") @db.VarChar(45) // IPv6 max length
  userAgent String?  @map("user_agent") @db.Text
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}

// ------------------------------------------------------------
// 12. RefreshToken — JWT refresh token rotation tracking
// ------------------------------------------------------------
model RefreshToken {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz
  isRevoked Boolean  @default(false) @map("is_revoked")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  // --- Relations ---
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked])
  @@index([expiresAt])
  @@map("refresh_tokens")
}

// ------------------------------------------------------------
// 13. AnalyticsSnapshot — Nightly precomputed stats
// ------------------------------------------------------------
model AnalyticsSnapshot {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  date            DateTime @db.Date
  adherenceRate   Float    @map("adherence_rate")
  maxStreak       Int      @map("max_streak")
  currentStreak   Int      @map("current_streak")
  delayedDoses    Int      @map("delayed_doses")
  vitalsCount     Int      @map("vitals_count")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date], name: "uq_user_date")
  @@index([date])
  @@map("analytics_snapshots")
}

```


### 5.14 VerificationToken

Handles password reset and email verification tokens for users.

### 5.15 Payment

Tracks appointment payments via Cashfree, including statuses and gateway order IDs.

### 5.16 MedicalRecord

Stores patient-uploaded medical reports with S3 URLs and soft-delete capabilities.

---

## Appendix: Quick Reference Card

```
16 Models    │  12 Enums    │  30+ Indexes    │  5 Compound Uniques
─────────────┼─────────────┼─────────────────┼──────────────────────
User         │ Role        │ See §7 table    │ DoctorAvailability
DoctorProfile│ DayOfWeek   │                 │   (profileId+day+time)
DoctorAvail  │ Appt.Status │                 │ Appointment
Appointment  │ Appt.Type   │                 │   (doctorId+date+token)
QueueToken   │ QueueStatus │                 │ MedicationLog
Medicine     │ Frequency   │                 │   (medicineId+scheduledAt)
MedicationLog│ MedLogStat  │                 │ CaregiverLink
Vital        │ VitalType   │                 │   (caregiverId+patientId)
CaregiverLink│ Notif.Type  │                 │
Notification │             │                 │
AuditLog     │             │                 │
RefreshToken │             │                 │
```
