import prisma from '../lib/prisma.js';

export const MedicalRecordService = {
  async createRecord(userId: string, name: string, fileUrl: string) {
    return prisma.medicalRecord.create({
      data: {
        userId,
        name,
        fileUrl,
      },
    });
  },

  async getRecordsByUser(userId: string) {
    return prisma.medicalRecord.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  async deleteRecord(userId: string, recordId: string) {
    return prisma.medicalRecord.update({
      where: { id: recordId, userId },
      data: { deletedAt: new Date() },
    });
  }
};
