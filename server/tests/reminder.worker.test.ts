import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reminderProcessor } from '../src/jobs/reminder.worker.js';
import prisma from '../src/lib/prisma.js';
import * as socketModule from '../src/lib/socket.js';

vi.mock('../src/lib/prisma.js', () => ({
  default: {
    notification: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/socket.js', () => ({
  getIO: vi.fn(),
}));

// Mock BullMQ completely to prevent it trying to connect to Redis
vi.mock('bullmq', () => {
  return {
    Worker: class {
      on() { return this; }
    },
    Queue: class {
      add() { return Promise.resolve(); }
    },
  };
});

describe('Reminder Worker Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a job, create a notification, and emit via socket', async () => {
    const emitMock = vi.fn();
    const toMock = vi.fn().mockReturnValue({ emit: emitMock });
    const ofMock = vi.fn().mockReturnValue({ to: toMock });

    (socketModule.getIO as any).mockReturnValue({
      of: ofMock,
    });

    (prisma.notification.create as any).mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      type: 'MEDICATION_REMINDER',
      title: 'Time for your medication',
      message: 'It is almost time to take your medication: Aspirin at 10:00:00 AM',
    });

    const mockJob = {
      data: {
        logId: 'log-1',
        userId: 'user-1',
        medicineName: 'Aspirin',
        scheduledAt: new Date('2030-01-01T10:00:00.000Z').toISOString(),
      },
      id: 'job-1',
      name: 'send-reminder',
    };

    await reminderProcessor(mockJob as any);

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: 'MEDICATION_REMINDER',
        title: 'Time for your medication',
        metadata: { logId: 'log-1', medicineName: 'Aspirin', scheduledAt: mockJob.data.scheduledAt }
      }),
    });

    expect(ofMock).toHaveBeenCalledWith('/notifications');
    expect(toMock).toHaveBeenCalledWith('user:user-1');
    expect(emitMock).toHaveBeenCalledWith('notification:new', expect.any(Object));
  });
});
