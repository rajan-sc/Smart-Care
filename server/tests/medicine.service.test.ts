import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MedicineService } from '../src/services/medicine.service.js';
import prisma from '../src/lib/prisma.js';
import { MedicationLogStatus } from '@prisma/client';

vi.mock('../src/lib/prisma.js', () => ({
  default: {
    medicationLog: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/cache.js', () => ({
  CacheUtils: {
    invalidate: vi.fn(),
  },
}));

describe('Medicine Service - Idempotency Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update log status to TAKEN if currently PENDING', async () => {
    (prisma.medicationLog.findUnique as any).mockResolvedValue({
      id: 'log-1',
      userId: 'user-1',
      status: MedicationLogStatus.PENDING,
    });
    
    (prisma.medicationLog.update as any).mockResolvedValue({
      id: 'log-1',
      userId: 'user-1',
      status: MedicationLogStatus.TAKEN,
      takenAt: new Date(),
    });

    const result = await MedicineService.markTaken('log-1', 'user-1');
    expect(result.status).toBe(MedicationLogStatus.TAKEN);
    expect(prisma.medicationLog.update).toHaveBeenCalledTimes(1);
  });

  it('should return existing log without DB update if already TAKEN (Idempotent)', async () => {
    (prisma.medicationLog.findUnique as any).mockResolvedValue({
      id: 'log-2',
      userId: 'user-2',
      status: MedicationLogStatus.TAKEN,
      takenAt: new Date(),
    });

    const result = await MedicineService.markTaken('log-2', 'user-2');
    expect(result.status).toBe(MedicationLogStatus.TAKEN);
    
    // update should NOT be called due to idempotency check
    expect(prisma.medicationLog.update).not.toHaveBeenCalled();
  });
});
