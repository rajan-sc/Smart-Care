import { Cashfree, CFEnvironment } from 'cashfree-pg';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';
import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';

let isCashfreeConfigured = false;
if (env.CASHFREE_CLIENT_ID && env.CASHFREE_CLIENT_SECRET) {
  (Cashfree as any).XClientId = env.CASHFREE_CLIENT_ID;
  (Cashfree as any).XClientSecret = env.CASHFREE_CLIENT_SECRET;
  (Cashfree as any).XEnvironment = CFEnvironment.SANDBOX;
  isCashfreeConfigured = true;
}

export const PaymentService = {
  async createPaymentOrder(appointmentId: string, userId: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctorProfile: true,
        patient: true,
        payment: true,
      },
    });

    if (!appointment) {
      throw AppError.notFound('Appointment not found');
    }
    if (appointment.patientId !== userId) {
      throw AppError.forbidden('You do not own this appointment');
    }
    if (appointment.payment && appointment.payment.status === 'SUCCESS') {
      throw AppError.badRequest('Payment has already been made for this appointment');
    }

    const orderAmount = Number(appointment.doctorProfile.consultationFee);
    if (orderAmount <= 0) {
      throw AppError.badRequest('No fee configured for this appointment');
    }

    // Try to reuse the existing payment record if it exists and is PENDING, or create a new one
    let payment = appointment.payment;
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          patientId: userId,
          amount: orderAmount,
          currency: 'INR',
          status: 'PENDING',
        },
      });
    }

    const gatewayOrderId = `order_${payment.id.replace(/-/g, '').substring(0, 20)}`;

    if (!isCashfreeConfigured) {
      logger.warn('Cashfree credentials missing. Simulating payment session.');
      await prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayOrderId, paymentSessionId: 'session_simulated_' + gatewayOrderId },
      });
      return { paymentSessionId: 'session_simulated_' + gatewayOrderId, orderId: gatewayOrderId, amount: orderAmount };
    }

    try {
      const expiryTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const request = {
        order_amount: orderAmount,
        order_currency: 'INR',
        order_id: gatewayOrderId,
        customer_details: {
          customer_id: userId,
          customer_phone: appointment.patient.phone || '9999999999',
          customer_name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
          customer_email: appointment.patient.email,
        },
        order_meta: {
          return_url: `${env.CORS_ORIGIN}/payment-status?order_id={order_id}`,
        },
      };

      const response = await (Cashfree as any).PGCreateOrder('2023-08-01', request);

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          gatewayOrderId,
          paymentSessionId: response.data.payment_session_id,
        },
      });

      return {
        paymentSessionId: response.data.payment_session_id,
        orderId: gatewayOrderId,
        amount: orderAmount,
      };
    } catch (error: any) {
      logger.error(error.response?.data || error.message, 'Cashfree Error');
      throw AppError.internal('Failed to initiate payment gateway');
    }
  },

  async verifyPayment(gatewayOrderId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId },
      include: { appointment: true },
    });

    if (!payment) {
      throw AppError.notFound('Payment order not found');
    }
    if (payment.patientId !== userId) {
      throw AppError.forbidden('You do not own this payment');
    }

    if (!isCashfreeConfigured) {
      logger.warn('Cashfree credentials missing. Simulating successful payment verification.');
      if (payment.status !== 'SUCCESS') {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'SUCCESS' },
          }),
          prisma.appointment.update({
            where: { id: payment.appointmentId },
            data: { status: 'CONFIRMED' },
          })
        ]);
      }
      return { status: 'SUCCESS', appointmentId: payment.appointmentId };
    }

    try {
      const response = await (Cashfree as any).PGFetchOrder('2023-08-01', gatewayOrderId);
      
      const statusStr = response.data.order_status; // "PAID", "ACTIVE", "EXPIRED", "FAILED"
      let newStatus = payment.status;

      if (statusStr === 'PAID') {
        newStatus = 'SUCCESS';
      } else if (statusStr === 'FAILED' || statusStr === 'EXPIRED') {
        newStatus = 'FAILED';
      }

      if (payment.status !== newStatus) {
        const updates: any[] = [
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: newStatus as any },
          })
        ];

        if (newStatus === 'SUCCESS') {
          updates.push(
            prisma.appointment.update({
              where: { id: payment.appointmentId },
              data: { status: 'CONFIRMED' },
            })
          );
        }

        await prisma.$transaction(updates);
      }

      return { status: newStatus, appointmentId: payment.appointmentId };
    } catch (error: any) {
      logger.error(error.response?.data || error.message, 'Cashfree Verification Error');
      throw AppError.internal('Failed to verify payment status');
    }
  },
};
