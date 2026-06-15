-- CreateEnum
CREATE TYPE "role" AS ENUM ('PATIENT', 'DOCTOR', 'CAREGIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "day_of_week" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "appointment_type" AS ENUM ('IN_PERSON', 'TELECONSULT');

-- CreateEnum
CREATE TYPE "queue_status" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "frequency" AS ENUM ('DAILY', 'TWICE_DAILY', 'THRICE_DAILY', 'WEEKLY', 'AS_NEEDED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "medication_log_status" AS ENUM ('PENDING', 'TAKEN', 'SKIPPED', 'MISSED', 'SNOOZED');

-- CreateEnum
CREATE TYPE "vital_type" AS ENUM ('BLOOD_PRESSURE', 'GLUCOSE', 'PULSE', 'WEIGHT', 'TEMPERATURE', 'OXYGEN_SATURATION');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('MEDICATION_REMINDER', 'APPOINTMENT_REMINDER', 'VITAL_ALERT', 'CAREGIVER_ALERT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "caregiver_link_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "token_type" AS ENUM ('RESET_PASSWORD', 'VERIFY_EMAIL');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "role" NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "specialization" VARCHAR(150) NOT NULL,
    "clinic_name" VARCHAR(200) NOT NULL,
    "clinic_address" TEXT,
    "consultation_fee" DECIMAL(10,2) NOT NULL,
    "avg_consultation_minutes" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "doctor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_availability" (
    "id" UUID NOT NULL,
    "doctor_profile_id" UUID NOT NULL,
    "day_of_week" "day_of_week" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "max_patients" INTEGER NOT NULL DEFAULT 20,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "doctor_profile_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "slot_start" TIMESTAMPTZ NOT NULL,
    "slot_end" TIMESTAMPTZ NOT NULL,
    "token_number" INTEGER NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'PENDING',
    "type" "appointment_type" NOT NULL DEFAULT 'IN_PERSON',
    "notes" TEXT,
    "clinical_notes" TEXT,
    "prescription" TEXT,
    "meeting_url" VARCHAR(500),
    "cancel_reason" TEXT,
    "cancelled_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_tokens" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "token_number" INTEGER NOT NULL,
    "status" "queue_status" NOT NULL DEFAULT 'WAITING',
    "estimated_wait_minutes" INTEGER,
    "called_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "dosage" VARCHAR(50) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "frequency" "frequency" NOT NULL,
    "timings" VARCHAR(5)[],
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_logs" (
    "id" UUID NOT NULL,
    "medicine_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMPTZ NOT NULL,
    "taken_at" TIMESTAMPTZ,
    "status" "medication_log_status" NOT NULL DEFAULT 'PENDING',
    "snooze_until" TIMESTAMPTZ,
    "notes" TEXT,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vitals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "vital_type" NOT NULL,
    "values" JSONB NOT NULL,
    "notes" TEXT,
    "recorded_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_links" (
    "id" UUID NOT NULL,
    "caregiver_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "relationship" VARCHAR(50) NOT NULL,
    "permissions" TEXT[],
    "status" "caregiver_link_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "caregiver_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "entity" VARCHAR(50) NOT NULL,
    "entity_id" VARCHAR(100) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "adherence_rate" DOUBLE PRECISION NOT NULL,
    "max_streak" INTEGER NOT NULL,
    "current_streak" INTEGER NOT NULL,
    "delayed_doses" INTEGER NOT NULL,
    "vitals_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" "token_type" NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "payment_session_id" VARCHAR(255),
    "gateway_order_id" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_deleted_at_idx" ON "users"("is_active", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_profiles_user_id_key" ON "doctor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "doctor_profiles_specialization_idx" ON "doctor_profiles"("specialization");

-- CreateIndex
CREATE INDEX "doctor_availability_doctor_profile_id_is_active_idx" ON "doctor_availability"("doctor_profile_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availability_doctor_profile_id_day_of_week_start_tim_key" ON "doctor_availability"("doctor_profile_id", "day_of_week", "start_time");

-- CreateIndex
CREATE INDEX "appointments_patient_id_status_idx" ON "appointments"("patient_id", "status");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_scheduled_date_idx" ON "appointments"("doctor_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "appointments_scheduled_date_status_idx" ON "appointments"("scheduled_date", "status");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_doctor_id_scheduled_date_token_number_key" ON "appointments"("doctor_id", "scheduled_date", "token_number");

-- CreateIndex
CREATE UNIQUE INDEX "queue_tokens_appointment_id_key" ON "queue_tokens"("appointment_id");

-- CreateIndex
CREATE INDEX "queue_tokens_doctor_id_status_idx" ON "queue_tokens"("doctor_id", "status");

-- CreateIndex
CREATE INDEX "queue_tokens_doctor_id_created_at_idx" ON "queue_tokens"("doctor_id", "created_at");

-- CreateIndex
CREATE INDEX "medicines_user_id_is_active_idx" ON "medicines"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "medicines_user_id_start_date_end_date_idx" ON "medicines"("user_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "medication_logs_user_id_scheduled_at_idx" ON "medication_logs"("user_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "medication_logs_user_id_status_idx" ON "medication_logs"("user_id", "status");

-- CreateIndex
CREATE INDEX "medication_logs_scheduled_at_status_idx" ON "medication_logs"("scheduled_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "medication_logs_medicine_id_scheduled_at_key" ON "medication_logs"("medicine_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "vitals_user_id_type_recorded_at_idx" ON "vitals"("user_id", "type", "recorded_at");

-- CreateIndex
CREATE INDEX "vitals_user_id_recorded_at_idx" ON "vitals"("user_id", "recorded_at");

-- CreateIndex
CREATE INDEX "caregiver_links_patient_id_status_idx" ON "caregiver_links"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_links_caregiver_id_patient_id_key" ON "caregiver_links"("caregiver_id", "patient_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_type_created_at_idx" ON "notifications"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_new_values_idx" ON "audit_logs" USING GIN ("new_values" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "audit_logs_old_values_idx" ON "audit_logs" USING GIN ("old_values" jsonb_path_ops);

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_is_revoked_idx" ON "refresh_tokens"("user_id", "is_revoked");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "analytics_snapshots_date_idx" ON "analytics_snapshots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_user_id_date_key" ON "analytics_snapshots"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_user_id_type_idx" ON "verification_tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "verification_tokens_token_idx" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "payments_appointment_id_key" ON "payments"("appointment_id");

-- CreateIndex
CREATE INDEX "payments_patient_id_idx" ON "payments"("patient_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "medical_records_user_id_idx" ON "medical_records"("user_id");

-- AddForeignKey
ALTER TABLE "doctor_profiles" ADD CONSTRAINT "doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_profile_id_fkey" FOREIGN KEY ("doctor_profile_id") REFERENCES "doctor_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tokens" ADD CONSTRAINT "queue_tokens_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tokens" ADD CONSTRAINT "queue_tokens_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_tokens" ADD CONSTRAINT "queue_tokens_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_logs" ADD CONSTRAINT "medication_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_links" ADD CONSTRAINT "caregiver_links_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caregiver_links" ADD CONSTRAINT "caregiver_links_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
