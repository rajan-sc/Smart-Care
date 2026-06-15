import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';
import { AppointmentType, DayOfWeek } from '@prisma/client';
import { NotificationService } from './notification.service.js';
import { v4 as uuidv4 } from 'uuid';
import { MedicineService } from './medicine.service.js';
import { S3Service } from './s3.service.js';
import { jsPDF } from 'jspdf';

export interface BookAppointmentInput {
  doctorId: string;
  scheduledDate: string; // YYYY-MM-DD
  type: AppointmentType;
  slotStart: string; // "HH:MM"
  slotEnd: string;   // "HH:MM"
  notes?: string;
}

export const AppointmentService = {
  async bookAppointment(patientId: string, data: BookAppointmentInput) {
    const dateObj = new Date(data.scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(dateObj.getTime()) || dateObj < today) {
      throw AppError.badRequest('Invalid or past scheduled date');
    }

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = days[dateObj.getDay()] as DayOfWeek;

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: data.doctorId },
      include: { availability: true },
    });

    if (!doctorProfile) {
      throw AppError.notFound('Doctor profile not found');
    }

    const slot = doctorProfile.availability.find(
      (a) => a.dayOfWeek === dayOfWeek && a.isActive && a.startTime === data.slotStart && a.endTime === data.slotEnd
    );

    if (!slot) {
      throw AppError.badRequest('Doctor is not available on this day');
    }

    const [startH, startM] = slot.startTime.split(':').map(Number);
    const [endH, endM] = slot.endTime.split(':').map(Number);

    const slotStart = new Date(dateObj);
    slotStart.setHours(startH, startM, 0, 0);

    const slotEnd = new Date(dateObj);
    slotEnd.setHours(endH, endM, 0, 0);

    return await prisma.$transaction(async (tx) => {
      const currentBookings = await tx.appointment.count({
        where: {
          doctorId: data.doctorId,
          scheduledDate: dateObj,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      });

      if (currentBookings >= slot.maxPatients) {
        throw AppError.badRequest('No available slots for this date');
      }

      // Compute token sequentially within the transaction lock
      const maxTokenResult = await tx.$queryRaw<{ max_token: number | null }[]>`
        SELECT COALESCE(MAX(token_number), 0) as max_token 
        FROM appointments 
        WHERE doctor_id = ${data.doctorId}::uuid 
          AND scheduled_date = ${dateObj}::date
      `;

      const nextTokenNumber = Number(maxTokenResult[0]?.max_token || 0) + 1;

      // We need to pre-generate the UUID to use it in the meeting URL
      const appointmentId = uuidv4();
      const meetingUrl = data.type === 'TELECONSULT' ? `https://meet.jit.si/smartcare-${appointmentId}` : null;

      const appointment = await tx.appointment.create({
        data: {
          id: appointmentId,
          patientId,
          doctorId: data.doctorId,
          doctorProfileId: doctorProfile.id,
          scheduledDate: dateObj,
          slotStart,
          slotEnd,
          tokenNumber: nextTokenNumber,
          type: data.type,
          status: data.type === 'IN_PERSON' ? 'CONFIRMED' : 'PENDING',
          notes: data.notes,
          meetingUrl,
        },
      });

      await tx.queueToken.create({
        data: {
          appointmentId: appointment.id,
          doctorId: data.doctorId,
          patientId,
          tokenNumber: nextTokenNumber,
        },
      });

      return appointment;
    });
  },

  async getMyAsPatient(patientId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId },
        include: { doctor: { select: { firstName: true, lastName: true } }, payment: true },
        skip,
        take: limit,
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.appointment.count({ where: { patientId } }),
    ]);
    return { data: appointments, meta: { total, page, limit } };
  },

  async getMyAsDoctor(doctorId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: { doctorId },
        include: { patient: { select: { firstName: true, lastName: true } }, payment: true },
        skip,
        take: limit,
        orderBy: { scheduledDate: 'desc' },
      }),
      prisma.appointment.count({ where: { doctorId } }),
    ]);
    return { data: appointments, meta: { total, page, limit } };
  },

  async cancelAppointment(appointmentId: string, userId: string, role: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: true, doctor: true },
    });

    if (!appointment) throw AppError.notFound('Appointment not found');
    if (role === 'PATIENT' && appointment.patientId !== userId) {
      throw AppError.forbidden('Not your appointment');
    }
    if (role === 'DOCTOR' && appointment.doctorId !== userId) {
      throw AppError.forbidden('Not your appointment');
    }

    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED', cancelledBy: userId },
      });
      await tx.queueToken.update({
        where: { appointmentId },
        data: { status: 'SKIPPED' },
      }).catch(() => null);
    });

    const targetUserId = role === 'PATIENT' ? appointment.doctorId : appointment.patientId;
    const dateStr = appointment.scheduledDate.toISOString().split('T')[0];
    const canceler = role === 'PATIENT' 
      ? `the patient (${appointment.patient.firstName} ${appointment.patient.lastName})` 
      : `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;

    await NotificationService.createAndEmit({
      userId: targetUserId,
      type: 'APPOINTMENT_REMINDER',
      title: 'Appointment Cancelled',
      message: `An appointment on ${dateStr} has been cancelled by ${canceler}.`,
      metadata: { appointmentId },
    });
  },

  async updateNotesAndPrescription(appointmentId: string, doctorId: string, clinicalNotes?: string, medicines?: any[]) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        doctor: true,
      }
    });

    if (!appointment) throw AppError.notFound('Appointment not found');
    if (appointment.doctorId !== doctorId) throw AppError.forbidden('Not your appointment');

    let prescriptionText = appointment.prescription;
    let fileUrl: string | undefined = undefined;

    if (medicines && medicines.length > 0) {
      prescriptionText = medicines.map(m => 
        `${m.name} ${m.dosage}${m.unit} — ${m.frequency} × ${m.durationDays || 'ongoing'} days\nInstructions: ${m.instructions || 'None'}`
      ).join('\n\n');

      const today = new Date();
      for (const m of medicines) {
        let endDate = null;
        if (m.durationDays) {
          endDate = new Date(today);
          endDate.setDate(endDate.getDate() + m.durationDays);
        }

        await MedicineService.createSchedule(appointment.patientId, {
          name: m.name,
          dosage: m.dosage,
          unit: m.unit,
          frequency: m.frequency,
          timings: m.timings,
          startDate: today.toISOString(),
          endDate: endDate ? endDate.toISOString() : null,
          instructions: m.instructions
        });
      }

      // Generate Rx Document as PDF
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('Smart Care - E-Prescription', 20, 20);
      doc.setFontSize(12);
      doc.text(`Doctor: Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`, 20, 40);
      doc.text(`Patient: ${appointment.patient.firstName} ${appointment.patient.lastName}`, 20, 50);
      doc.text(`Date: ${today.toDateString()}`, 20, 60);
      
      doc.text('Clinical Notes:', 20, 80);
      doc.setFontSize(10);
      const notesLines = doc.splitTextToSize(clinicalNotes || 'None provided.', 170);
      doc.text(notesLines, 20, 90);
      
      let currentY = 90 + (notesLines.length * 6) + 10;
      doc.setFontSize(12);
      doc.text('Prescription:', 20, currentY);
      doc.setFontSize(10);
      const rxLines = doc.splitTextToSize(prescriptionText || 'None', 170);
      doc.text(rxLines, 20, currentY + 10);

      const pdfArrayBuffer = doc.output('arraybuffer');
      const pdfBuffer = Buffer.from(pdfArrayBuffer);

      const filename = `rx-${appointment.patientId}-${Date.now()}.pdf`;
      fileUrl = await S3Service.uploadFile(pdfBuffer, filename, 'application/pdf');

      // Create Medical Record for the patient
      await prisma.medicalRecord.create({
        data: {
          userId: appointment.patientId,
          name: `Prescription - Dr. ${appointment.doctor.lastName}`,
          fileUrl: fileUrl,
        }
      });
    }

    const updatedAppt = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        clinicalNotes: clinicalNotes !== undefined ? clinicalNotes : appointment.clinicalNotes,
        prescription: prescriptionText,
      },
    });

    return { ...updatedAppt, fileUrl };
  },
};
