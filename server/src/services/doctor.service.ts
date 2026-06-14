import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';
import { DayOfWeek } from '@prisma/client';

export interface UpdateDoctorProfileInput {
  specialization?: string;
  clinicName?: string;
  clinicAddress?: string;
  consultationFee?: number;
  avgConsultationMinutes?: number;
}

export interface AvailabilitySlotInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  maxPatients: number;
}

export const DoctorService = {
  async updateProfile(userId: string, data: UpdateDoctorProfileInput) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw AppError.notFound('Doctor profile not found');
    }

    const updated = await prisma.doctorProfile.update({
      where: { userId },
      data,
    });

    return updated;
  },

  async updateAvailability(userId: string, slots: AvailabilitySlotInput[]) {
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw AppError.notFound('Doctor profile not found');
    }

    // Ensure logic handles startTime < endTime correctly.
    // The Zod validator already checks this, but we reinforce it.
    for (const slot of slots) {
      if (slot.startTime >= slot.endTime) {
        throw AppError.badRequest(`Start time must be before end time for ${slot.dayOfWeek}`);
      }
    }

    const updatedAvailability = await prisma.$transaction(async (tx) => {
      // Replace entire schedule for this doctor
      await tx.doctorAvailability.deleteMany({
        where: { doctorProfileId: profile.id },
      });

      if (slots.length > 0) {
        await tx.doctorAvailability.createMany({
          data: slots.map((slot) => ({
            ...slot,
            doctorProfileId: profile.id,
            isActive: true,
          })),
        });
      }

      return tx.doctorAvailability.findMany({
        where: { doctorProfileId: profile.id },
      });
    });

    return updatedAvailability;
  },

  async getDoctorProfile(doctorId: string) {
    const user = await prisma.user.findUnique({
      where: { id: doctorId, role: 'DOCTOR', deletedAt: null },
      include: {
        doctorProfile: {
          include: {
            availability: true,
          },
        },
      },
    });

    if (!user || !user.doctorProfile) {
      throw AppError.notFound('Doctor not found');
    }

    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      profile: user.doctorProfile,
    };
  },

  async searchDoctors(search?: string, specialization?: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where: any = { role: 'DOCTOR', deletedAt: null, isActive: true };

    const AND: any[] = [];
    if (specialization) {
      AND.push({
        doctorProfile: {
          is: { specialization: { equals: specialization, mode: 'insensitive' } }
        }
      });
    }

    if (search) {
      AND.push({
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { doctorProfile: { is: { specialization: { contains: search, mode: 'insensitive' } } } }
        ]
      });
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    const [doctors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          doctorProfile: true,
        },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: doctors.map(d => ({
        id: d.id,
        firstName: d.firstName,
        lastName: d.lastName,
        doctorProfile: d.doctorProfile,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      }
    };
  },

  async _verifyDoctorPatientRelationship(doctorId: string, patientId: string) {
    const appointmentCount = await prisma.appointment.count({
      where: { doctorId, patientId },
    });
    if (appointmentCount === 0) {
      throw AppError.forbidden('You do not have access to this patient. No prior appointments found.');
    }
  },

  async getMyPatients(doctorId: string) {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      select: { patientId: true },
      distinct: ['patientId'],
    });

    const patientIds = appointments.map(a => a.patientId);

    const patients = await prisma.user.findMany({
      where: { id: { in: patientIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      }
    });

    return patients;
  },

  async getPatientVitals(doctorId: string, patientId: string) {
    await this._verifyDoctorPatientRelationship(doctorId, patientId);
    return await prisma.vital.findMany({
      where: { userId: patientId },
      orderBy: { recordedAt: 'desc' },
      take: 30,
    });
  },

  async getPatientMedications(doctorId: string, patientId: string) {
    await this._verifyDoctorPatientRelationship(doctorId, patientId);
    return await prisma.medicine.findMany({
      where: { userId: patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        medicationLogs: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
        }
      }
    });
  },

  async getPatientRecords(doctorId: string, patientId: string) {
    await this._verifyDoctorPatientRelationship(doctorId, patientId);
    return await prisma.medicalRecord.findMany({
      where: { userId: patientId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },
};
