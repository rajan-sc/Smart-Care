import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role;
      };
    }
  }
}

// Declares custom global type definitions extending Express  Request  to securely hold the authenticated user payload.
// so after verifying the middleware attaches it to req.user earlier it was not possible

