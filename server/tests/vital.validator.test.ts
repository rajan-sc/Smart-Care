import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { VitalType } from '@prisma/client';

const app = createApp();

vi.mock('../src/lib/prisma.js', () => {
  return {
    default: {
      vital: {
        create: vi.fn(),
      },
    },
  };
});

describe('Vital Validation Integration Tests', () => {
  let token: string;

  beforeEach(() => {
    vi.clearAllMocks();
    token = jwt.sign({ userId: 'user-1', email: 'test@example.com', role: 'PATIENT' }, env.JWT_SECRET, { expiresIn: '15m' });
  });

  it('should reject blood pressure readings outside safe boundaries', async () => {
    const res = await request(app)
      .post('/api/v1/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vitalType: VitalType.BLOOD_PRESSURE,
        values: { systolic: 40, diastolic: 250 } // out of range
      });

    expect(res.status).toBe(422); // 422 Validation Error
    expect(res.body.success).toBe(false);
    expect(res.body.error.details['body.values.systolic']).toContain('Systolic BP must be between 50 and 300 mmHg');
    expect(res.body.error.details['body.values.diastolic']).toContain('Diastolic BP must be between 30 and 200 mmHg');
  });

  it('should reject glucose readings outside safe boundaries', async () => {
    const res = await request(app)
      .post('/api/v1/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vitalType: VitalType.GLUCOSE,
        values: { value: 1500, isFasting: true } // out of range
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.details['body.values.value']).toContain('Glucose must be between 20 and 1000 mg/dL');
  });

  it('should reject pulse readings outside safe boundaries', async () => {
    const res = await request(app)
      .post('/api/v1/vitals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        vitalType: VitalType.PULSE,
        values: { bpm: 20 } // out of range
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.details['body.values.bpm']).toContain('Pulse must be between 30 and 250 bpm');
  });
});
