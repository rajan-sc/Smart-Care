import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/apiError.js';

export const PaymentController = {
  createOrder: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { appointmentId } = req.body;

    if (!userId) throw AppError.unauthorized('User context missing');
    if (!appointmentId) throw AppError.badRequest('appointmentId is required');

    const data = await PaymentService.createPaymentOrder(appointmentId, userId);
    return ApiResponse.ok(res, data);
  }),

  verifyPayment: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { orderId } = req.body;

    if (!userId) throw AppError.unauthorized('User context missing');
    if (!orderId) throw AppError.badRequest('orderId is required');

    const data = await PaymentService.verifyPayment(orderId, userId);
    return ApiResponse.ok(res, data);
  }),
};
