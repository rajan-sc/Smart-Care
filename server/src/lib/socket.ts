import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '@prisma/client';
import logger from '../utils/logger.js';

interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
}

let io: SocketIOServer;

export const initializeSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  const queueNamespace = io.of('/queue');

  queueNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch (_err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  queueNamespace.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info(`Socket connected: ${socket.id} (User: ${user.userId})`);

    socket.on('join_queue', (doctorId: string) => {
      // Room format: queue:{doctorId}
      const roomName = `queue:${doctorId}`;
      socket.join(roomName);
      logger.info(`User ${user.userId} joined room ${roomName}`);
    });

    socket.on('leave_queue', (doctorId: string) => {
      const roomName = `queue:${doctorId}`;
      socket.leave(roomName);
      logger.info(`User ${user.userId} left room ${roomName}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected from queue: ${socket.id}`);
    });
  });

  const notificationNamespace = io.of('/notifications');

  notificationNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch (_err) {
      next(new Error('Authentication error'));
    }
  });

  notificationNamespace.on('connection', (socket) => {
    const user = socket.data.user as JwtPayload;
    const roomName = `user:${user.userId}`;
    socket.join(roomName);
    logger.info(`User ${user.userId} joined notification room ${roomName}`);

    socket.on('disconnect', () => {
      logger.info(`User ${user.userId} left notification room ${roomName}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
