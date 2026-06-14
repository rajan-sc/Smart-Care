import { io, Socket } from 'socket.io-client';
import { storage } from '../utils/storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private queueSocket: Socket | null = null;

  connect() {
    const token = storage.get('accessToken');
    if (!token) return;

    if (!this.socket) {
      this.socket = io(`${API_URL}/notifications`, {
        auth: { token },
        transports: ['websocket'],
      });
      
      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err.message);
      });
    }

    if (!this.queueSocket) {
      this.queueSocket = io(`${API_URL}/queue`, {
        auth: { token },
        transports: ['websocket'],
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.queueSocket) {
      this.queueSocket.disconnect();
      this.queueSocket = null;
    }
  }

  getNotificationSocket() {
    return this.socket;
  }

  getQueueSocket() {
    return this.queueSocket;
  }
}

export const socketService = new SocketService();
