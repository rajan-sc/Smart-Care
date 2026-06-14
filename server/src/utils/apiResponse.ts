import { Response } from 'express';

export class ApiResponse {
  static send(res: Response, statusCode: number, data: any, meta?: Record<string, any>) {
    return res.status(statusCode).json({
      success: true,
      data,
      ...(meta && { meta }),
    });
  }

  static ok(res: Response, data: any, meta?: Record<string, any>) {
    return ApiResponse.send(res, 200, data, meta);
  }

  static created(res: Response, data: any, meta?: Record<string, any>) {
    return ApiResponse.send(res, 201, data, meta);
  }

  static paginated(res: Response, data: any[], page: number, limit: number, total: number) {
    const meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    return ApiResponse.send(res, 200, data, meta);
  }
}
