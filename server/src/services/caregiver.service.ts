import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';
import { CaregiverLinkStatus, Role } from '@prisma/client';

export const CaregiverService = {
  async linkCaregiver(patientId: string, email: string, relationship: string, permissions: string[]) {
    const caregiverUser = await prisma.user.findUnique({ where: { email } });

    if (!caregiverUser || caregiverUser.role !== Role.CAREGIVER) {
      throw AppError.badRequest('User not found or is not a Caregiver');
    }

    if (caregiverUser.id === patientId) {
      throw AppError.badRequest('Cannot link yourself as caregiver');
    }

    // Upsert link
    return prisma.caregiverLink.upsert({
      where: {
        uq_caregiver_patient: {
          caregiverId: caregiverUser.id,
          patientId,
        },
      },
      update: { relationship, permissions, status: CaregiverLinkStatus.PENDING },
      create: {
        caregiverId: caregiverUser.id,
        patientId,
        relationship,
        permissions,
        status: CaregiverLinkStatus.PENDING,
      },
    });
  },

  async updateLinkStatusOrPermissions(linkId: string, userId: string, role: string, data: { status?: CaregiverLinkStatus, permissions?: string[] }) {
    const link = await prisma.caregiverLink.findUnique({ where: { id: linkId } });
    
    if (!link) {
      throw AppError.notFound('Caregiver link not found');
    }

    if (role === Role.CAREGIVER && link.caregiverId !== userId) {
      throw AppError.forbidden('Not your link');
    }
    
    if (role === Role.PATIENT && link.patientId !== userId) {
      throw AppError.forbidden('Not your link');
    }

    // Caregivers can accept/reject, patients can update permissions
    const updateData: any = {};
    if (role === Role.CAREGIVER && data.status) {
      updateData.status = data.status;
    }
    if (role === Role.PATIENT && data.permissions) {
      updateData.permissions = data.permissions;
    }

    if (Object.keys(updateData).length === 0) {
      throw AppError.badRequest('No valid updates provided for your role');
    }

    return prisma.caregiverLink.update({
      where: { id: linkId },
      data: updateData,
    });
  },

  async revokeCaregiverLink(linkId: string, patientId: string) {
    const link = await prisma.caregiverLink.findUnique({ where: { id: linkId } });
    
    if (!link) {
      throw AppError.notFound('Caregiver link not found');
    }

    if (link.patientId !== patientId) {
      throw AppError.forbidden('Not your link');
    }

    // Soft delete / deactivate
    return prisma.caregiverLink.update({
      where: { id: linkId },
      data: { status: CaregiverLinkStatus.REJECTED },
    });
  },

  async getLinkedPatients(caregiverId: string) {
    const links = await prisma.caregiverLink.findMany({
      where: { caregiverId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    // Fetch unread CAREGIVER_ALERT or VITAL_ALERT notifications for this caregiver
    const unreadAlerts = await prisma.notification.findMany({
      where: {
        userId: caregiverId,
        isRead: false,
        type: { in: ['CAREGIVER_ALERT', 'VITAL_ALERT'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const enrichedLinks = links.map(link => {
      // Find the latest unread alert where metadata.patientId === link.patientId
      const alertForPatient = unreadAlerts.find(a => {
        const meta = a.metadata as any;
        return meta && meta.patientId === link.patientId;
      });
      
      return {
        ...link,
        latestAlert: alertForPatient || null
      };
    });

    return enrichedLinks;
  },

  async getPatientCaregivers(patientId: string) {
    return prisma.caregiverLink.findMany({
      where: {
        patientId,
        status: { not: CaregiverLinkStatus.REJECTED },
      },
      include: {
        caregiver: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async assertAccess(caregiverId: string, patientId: string, requiredPermission: string) {
    const link = await prisma.caregiverLink.findUnique({
      where: {
        uq_caregiver_patient: { caregiverId, patientId },
      },
    });

    if (!link || link.status !== CaregiverLinkStatus.ACCEPTED) {
      throw AppError.forbidden('No active caregiver link found for this patient');
    }

    if (!link.permissions.includes(requiredPermission)) {
      throw AppError.forbidden(`Missing required permission: ${requiredPermission}`);
    }
  },

  async getPatientVitals(caregiverId: string, patientId: string, page = 1, limit = 10) {
    await this.assertAccess(caregiverId, patientId, 'VIEW_VITALS');
    
    const skip = (page - 1) * limit;
    const [vitals, total] = await Promise.all([
      prisma.vital.findMany({
        where: { userId: patientId },
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vital.count({ where: { userId: patientId } }),
    ]);

    return { data: vitals, meta: { total, page, limit } };
  },

  async getPatientMedications(caregiverId: string, patientId: string, page = 1, limit = 10) {
    await this.assertAccess(caregiverId, patientId, 'VIEW_MEDICATIONS');
    
    const skip = (page - 1) * limit;
    const [medicines, total] = await Promise.all([
      prisma.medicine.findMany({
        where: { userId: patientId, isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.medicine.count({ where: { userId: patientId, isActive: true } }),
    ]);

    return { data: medicines, meta: { total, page, limit } };
  },

  async getPatientAppointments(caregiverId: string, patientId: string, page = 1, limit = 10) {
    await this.assertAccess(caregiverId, patientId, 'VIEW_APPOINTMENTS');

    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        orderBy: { scheduledDate: 'desc' },
        include: { doctor: true },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where: { patientId } }),
    ]);

    return { data: appointments, meta: { total, page, limit } };
  },

  async getPatientRecords(caregiverId: string, patientId: string, page = 1, limit = 10) {
    // Caregivers might need a separate permission, but for now we'll check if they have basic access, 
    // or we can add a VIEW_RECORDS permission. Since we didn't add it to Prisma enum, let's reuse VIEW_VITALS 
    // or just assume active link is enough for now, but let's be strict.
    // Wait, let's just check if they are an accepted caregiver for this patient.
    const link = await prisma.caregiverLink.findUnique({
      where: { uq_caregiver_patient: { caregiverId, patientId } },
    });
    if (!link || link.status !== CaregiverLinkStatus.ACCEPTED) {
      throw AppError.forbidden('No active caregiver link found for this patient');
    }

    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where: { userId: patientId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.medicalRecord.count({ where: { userId: patientId, deletedAt: null } }),
    ]);

    return { data: records, meta: { total, page, limit } };
  }
};
