import { Request, Response } from 'express';
import { AppError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { S3Service } from '../services/s3.service.js';
import { MedicalRecordService } from '../services/medicalRecord.service.js';
import crypto from 'crypto';

export const MedicalRecordController = {
  async uploadRecord(req: Request, res: Response) {
    if (!req.file) {
      throw AppError.badRequest('No file uploaded');
    }

    const { name } = req.body;
    if (!name) {
      throw AppError.badRequest('File name is required');
    }

    const userId = req.user!.id;
    const fileExt = req.file.originalname.split('.').pop() || '';
    const filename = `medical_records/${userId}/${crypto.randomBytes(16).toString('hex')}.${fileExt}`;

    const fileUrl = await S3Service.uploadFile(req.file.buffer, filename, req.file.mimetype);

    const record = await MedicalRecordService.createRecord(userId, name, fileUrl);

    return ApiResponse.created(res, record, { message: 'Medical record uploaded successfully' });
  },

  async getMyRecords(req: Request, res: Response) {
    const userId = req.user!.id;
    const records = await MedicalRecordService.getRecordsByUser(userId);
    return ApiResponse.ok(res, records);
  },

  async deleteRecord(req: Request, res: Response) {
    const userId = req.user!.id;
    const recordId = req.params.id as string;
    await MedicalRecordService.deleteRecord(userId, recordId);
    return ApiResponse.ok(res, null, { message: 'Record deleted successfully' });
  }
};
