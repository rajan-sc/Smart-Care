import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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

  // --- 2. Doctor Users with associated DoctorProfiles ---
  const doctor1 = await prisma.user.upsert({
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
          specialization: 'General Medicine',
          clinicName: 'SmartCare Clinic',
          clinicAddress: '42 MG Road, Bangalore 560001',
          consultationFee: 0.00,
          avgConsultationMinutes: 15,
        },
      },
    },
  });

  const doctor2 = await prisma.user.upsert({
    where: { email: 'dr.patel@smartcare.dev' },
    update: {},
    create: {
      email: 'dr.patel@smartcare.dev',
      passwordHash: await bcrypt.hash('Doctor@123', 12),
      role: Role.DOCTOR,
      firstName: 'Rajesh',
      lastName: 'Patel',
      phone: '+919999900002',
      isVerified: true,
      isActive: true,
      doctorProfile: {
        create: {
          specialization: 'Pediatrics',
          clinicName: 'City Care Clinic',
          clinicAddress: '108 Residency Road, Bangalore 560025',
          consultationFee: 0.00,
          avgConsultationMinutes: 15,
        },
      },
    },
  });

  // --- 3. Patient Users ---
  const patient1 = await prisma.user.upsert({
    where: { email: 'patient.kumar@gmail.com' },
    update: {},
    create: {
      email: 'patient.kumar@gmail.com',
      passwordHash: await bcrypt.hash('Patient@123', 12),
      role: Role.PATIENT,
      firstName: 'Rahul',
      lastName: 'Kumar',
      phone: '+919999900003',
      isVerified: true,
      isActive: true,
    },
  });

  const patient2 = await prisma.user.upsert({
    where: { email: 'patient.singh@gmail.com' },
    update: {},
    create: {
      email: 'patient.singh@gmail.com',
      passwordHash: await bcrypt.hash('Patient@123', 12),
      role: Role.PATIENT,
      firstName: 'Amit',
      lastName: 'Singh',
      phone: '+919999900004',
      isVerified: true,
      isActive: true,
    },
  });

  // --- 4. Caregiver User ---
  const caregiver1 = await prisma.user.upsert({
    where: { email: 'caregiver@smartcare.dev' },
    update: {},
    create: {
      email: 'caregiver@smartcare.dev',
      passwordHash: await bcrypt.hash('Caregiver@123', 12),
      role: Role.CAREGIVER,
      firstName: 'Sarah',
      lastName: 'Connor',
      phone: '+919999900005',
      isVerified: true,
      isActive: true,
    },
  });

  console.log('✅ Seed data created successfully');
  console.log({
    admin: admin.email,
    doctor1: doctor1.email,
    doctor2: doctor2.email,
    patient1: patient1.email,
    patient2: patient2.email,
    caregiver1: caregiver1.email,
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
