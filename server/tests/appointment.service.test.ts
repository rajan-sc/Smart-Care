import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentService } from '../src/services/appointment.service.js';
import prisma from '../src/lib/prisma.js';
import { AppointmentType } from '@prisma/client';

// Mock prisma
vi.mock('../src/lib/prisma.js', () => {
  return {
    default: {
      $transaction: vi.fn(),
      doctorProfile: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe('AppointmentService - Concurrent Booking Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should simulate concurrent bookings and assign sequential token numbers', async () => {
    // 2030-01-01 is a Tuesday
    (prisma.doctorProfile.findUnique as any).mockResolvedValue({
      id: 'doc-profile-1',
      userId: 'doc-user-1',
      availability: [
        {
          dayOfWeek: 'TUESDAY',
          isActive: true,
          startTime: '09:00',
          endTime: '17:00',
          maxPatients: 10,
        },
      ],
    });

    let mockMaxToken = 0;
    
    // Mock the $transaction to execute the callback immediately
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const tx = {
        appointment: {
          count: vi.fn().mockResolvedValue(mockMaxToken),
          create: vi.fn().mockImplementation((data: any) => {
            return Promise.resolve({ id: 'app-id', ...data.data });
          }),
        },
        queueToken: {
          create: vi.fn().mockResolvedValue({}),
        },
        $queryRaw: vi.fn().mockImplementation(async () => {
          const result = [{ max_token: mockMaxToken }];
          mockMaxToken++; // Simulate sequence increment inside lock
          return result;
        }),
      };
      
      return await callback(tx);
    });

    // Fire 5 bookings concurrently
    const requests = Array.from({ length: 5 }).map((_, index) => {
      return AppointmentService.bookAppointment(`patient-${index}`, {
        doctorId: 'doc-user-1',
        scheduledDate: '2030-01-01',
        type: AppointmentType.IN_PERSON,
      });
    });

    const results = await Promise.all(requests);

    // Verify token numbers are exactly 1, 2, 3, 4, 5
    const tokenNumbers = results.map(r => r.tokenNumber).sort((a, b) => a - b);
    expect(tokenNumbers).toEqual([1, 2, 3, 4, 5]);
  });
});
