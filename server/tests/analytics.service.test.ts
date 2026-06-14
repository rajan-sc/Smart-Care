import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsService } from '../src/services/analytics.service.js';
import { CacheUtils } from '../src/lib/cache.js';
import prisma from '../src/lib/prisma.js';

vi.mock('../src/lib/prisma.js', () => ({
  default: {
    medicationLog: {
      findMany: vi.fn(),
    },
    appointment: {
      findFirst: vi.fn(),
    },
    vital: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/cache.js', () => ({
  CacheUtils: {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
  },
}));

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached dashboard if available', async () => {
    (CacheUtils.get as any).mockResolvedValue({ adherenceRate: 90 });

    const result = await AnalyticsService.getDashboard('user-1', 'PATIENT', '2025-01-01');

    expect(result.adherenceRate).toBe(90);
    expect(CacheUtils.get).toHaveBeenCalledWith('analytics:user-1:2025-01-01');
    expect(prisma.medicationLog.findMany).not.toHaveBeenCalled();
  });

  it('should compute dashboard from DB if cache miss, and write to cache', async () => {
    (CacheUtils.get as any).mockResolvedValue(null);

    (prisma.medicationLog.findMany as any).mockResolvedValue([
      { status: 'TAKEN' },
      { status: 'PENDING' },
    ]);
    (prisma.appointment.findFirst as any).mockResolvedValue(null);
    (prisma.vital.findMany as any).mockResolvedValue([]);

    const result = await AnalyticsService.getDashboard('user-1', 'PATIENT', '2025-01-01');

    expect(result.adherenceRate).toBe(50); // 1/2
    expect(prisma.medicationLog.findMany).toHaveBeenCalled();
    expect(CacheUtils.set).toHaveBeenCalledWith('analytics:user-1:2025-01-01', expect.any(Object), 86400);
  });
});
