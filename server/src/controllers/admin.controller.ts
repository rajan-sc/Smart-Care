import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const AdminController = {
  async getUsers(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const role = req.query.role as any;

    const data = await AdminService.getUsers(page, limit, search, role);
    return ApiResponse.ok(res, data);
  },

  async updateUserRole(req: Request, res: Response) {
    const userId = req.params.id;
    const newRole = req.body.role;
    const adminId = req.user!.id;
    
    const ipAddress = typeof req.ip === 'string' ? req.ip : '';
    const ua = req.headers['user-agent'];
    const userAgent = Array.isArray(ua) ? ua[0] : (ua || '');

    const user = await AdminService.updateUserRole(
      userId as string,
      newRole as import('@prisma/client').Role,
      adminId as string,
      ipAddress as string,
      userAgent as string
    );
    return ApiResponse.ok(res, user);
  },

  async getAuditLogs(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const entity = req.query.entity as string | undefined;
    const action = req.query.action as string | undefined;

    const data = await AdminService.getAuditLogs(page, limit, entity, action);
    return ApiResponse.ok(res, data);
  },

  async updateDoctorVerification(req: Request, res: Response) {
    const { status, notes } = req.body;
    const doctor = await AdminService.updateDoctorVerification(req.params.id as string, status, notes);
    return ApiResponse.ok(res, doctor);
  },

  async softDeleteUser(req: Request, res: Response) {
    const userId = req.params.id;
    const adminId = req.user!.id;
    const ipAddress = typeof req.ip === 'string' ? req.ip : '';
    const ua = req.headers['user-agent'];
    const userAgent = Array.isArray(ua) ? ua[0] : (ua || '');

    const user = await AdminService.softDeleteUser(userId as string, adminId, ipAddress, userAgent as string);
    return ApiResponse.ok(res, user);
  },

  async getSystemAnalytics(req: Request, res: Response) {
    const data = await AdminService.getSystemAnalytics();
    return ApiResponse.ok(res, data);
  },
};
