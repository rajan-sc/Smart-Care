import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaregiverService } from '../src/services/caregiver.service.js';
import prisma from '../src/lib/prisma.js';

vi.mock('../src/lib/prisma.js', () => ({
  default: {
    caregiverLink: {
      findUnique: vi.fn(),
    },
    vital: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('Caregiver Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block a caregiver from viewing vitals if permission is missing', async () => {
    (prisma.caregiverLink.findUnique as any).mockResolvedValue({
      id: 'link-1',
      caregiverId: 'caregiver-1',
      patientId: 'patient-1',
      status: 'ACCEPTED',
      permissions: ['VIEW_MEDICATIONS'], // MISSING 'VIEW_VITALS'
    });

    await expect(CaregiverService.getPatientVitals('caregiver-1', 'patient-1'))
      .rejects
      .toThrow('Missing required permission: VIEW_VITALS');
      
    expect(prisma.vital.findMany).not.toHaveBeenCalled();
  });

  it('should allow a caregiver to view vitals if permission is granted', async () => {
    (prisma.caregiverLink.findUnique as any).mockResolvedValue({
      id: 'link-1',
      caregiverId: 'caregiver-1',
      patientId: 'patient-1',
      status: 'ACCEPTED',
      permissions: ['VIEW_VITALS'], 
    });

    (prisma.vital.findMany as any).mockResolvedValue([{ id: 'vital-1' }]);
    (prisma.vital.count as any).mockResolvedValue(1);

    const result = await CaregiverService.getPatientVitals('caregiver-1', 'patient-1');
    expect(result.data).toHaveLength(1);
    expect(prisma.vital.findMany).toHaveBeenCalled();
  });

  it('should block if link status is not ACCEPTED', async () => {
    (prisma.caregiverLink.findUnique as any).mockResolvedValue({
      id: 'link-1',
      caregiverId: 'caregiver-1',
      patientId: 'patient-1',
      status: 'PENDING',
      permissions: ['VIEW_VITALS'], 
    });

    await expect(CaregiverService.getPatientVitals('caregiver-1', 'patient-1'))
      .rejects
      .toThrow('No active caregiver link found for this patient');
  });
});
