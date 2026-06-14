import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/apiError.js';

export const AuthController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const tokens = await AuthService.register(req.body, ipAddress, userAgent);
    return ApiResponse.created(res, tokens);
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];
    const tokens = await AuthService.login(req.body, ipAddress, userAgent);
    return ApiResponse.ok(res, tokens);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      throw AppError.badRequest('Refresh token is required');
    }
    const tokens = await AuthService.refresh(refreshToken);
    return ApiResponse.ok(res, tokens);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      throw AppError.badRequest('Refresh token is required');
    }
    await AuthService.logout(refreshToken);
    return ApiResponse.ok(res, { message: 'Logged out successfully' });
  }),

  getMe: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw AppError.unauthorized('User context is missing');
    }
    const user = await AuthService.getMe(userId);
    return ApiResponse.ok(res, user);
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw AppError.unauthorized('User context is missing');
    }
    await AuthService.changePassword(userId, req.body);
    return ApiResponse.ok(res, {
      message: 'Password changed successfully. All other sessions have been logged out.',
    });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    await AuthService.forgotPassword(req.body.email, req.ip);
    return ApiResponse.ok(res, { message: 'If that email is registered, a reset link has been sent.' });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    await AuthService.resetPassword(req.body.token, req.body.newPassword, req.ip);
    return ApiResponse.ok(res, { message: 'Password has been reset successfully. Please log in.' });
  }),

  requestVerificationEmail: asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw AppError.unauthorized('User context is missing');
    }
    await AuthService.requestVerificationEmail(userId, req.ip);
    return ApiResponse.ok(res, { message: 'Verification email has been sent.' });
  }),

  verifyEmail: asyncHandler(async (req: Request, res: Response) => {
    await AuthService.verifyEmail(req.body.token, req.ip);
    return ApiResponse.ok(res, { message: 'Email has been verified successfully.' });
  }),
};
