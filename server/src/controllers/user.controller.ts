import { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';

export const UserController = {
  async updateProfile(req: Request, res: Response) {
    const updatedUser = await UserService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: updatedUser });
  },

  async deleteUser(req: Request, res: Response) {
    await UserService.softDeleteUser(req.params.id as string, req.user!.id, req.ip, req.headers['user-agent'] as string | undefined);
    res.json({ success: true, data: { message: 'User deleted successfully' } });
  },
};
