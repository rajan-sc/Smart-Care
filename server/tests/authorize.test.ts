import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authorize } from '../src/middleware/authorize.js';

describe('RBAC Role Guard Middleware', () => {
  it('should allow access if user role matches allowed roles', () => {
    const middleware = authorize([Role.DOCTOR, Role.ADMIN]);

    const req = {
      user: {
        id: 'user-1',
        email: 'doctor@smartcare.dev',
        role: Role.DOCTOR,
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(next).not.toHaveBeenCalledWith(expect.any(Error));
  });

  it('should block access and throw a 403 AppError if user role does not match allowed roles', () => {
    const middleware = authorize([Role.DOCTOR]);

    const req = {
      user: {
        id: 'user-1',
        email: 'patient@smartcare.dev',
        role: Role.PATIENT,
      },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    expect(() => middleware(req, res, next)).toThrow(
      expect.objectContaining({
        statusCode: 403,
        code: 'FORBIDDEN',
      }),
    );
  });

  it('should throw a 401 AppError if req.user is missing', () => {
    const middleware = authorize([Role.PATIENT]);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    expect(() => middleware(req, res, next)).toThrow(
      expect.objectContaining({
        statusCode: 401,
      }),
    );
  });
});
//
