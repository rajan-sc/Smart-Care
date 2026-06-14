import { z } from 'zod';
import { Role } from '@prisma/client';

export const queryUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    role: z.nativeEnum(Role),
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

export const queryAuditLogsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    entity: z.string().optional(),
    action: z.string().optional(),
  }),
});
