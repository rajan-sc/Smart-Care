import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { storage } from '../utils/storage';

type EventMap = Record<string, (...args: unknown[]) => void>;

interface UseSocketOptions {
  namespace?: string;
  autoConnect?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  on:  (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { namespace = '/', autoConnect = true } = options;
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<EventMap>({});

  useEffect(() => {
    if (!autoConnect) return;

    const token = storage.get('accessToken') as string | null;
    const url = import.meta.env.VITE_SOCKET_URL || '';
    const socket = io(`${url}${namespace}`, {
      auth: { token: token ? `Bearer ${token}` : '' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.debug(`[Socket] Connected: ${socket.id} → ${namespace}`);
    });

    socket.on('connect_error', (err) => {
      console.warn(`[Socket] Connection error: ${err.message}`);
    });

    socket.on('disconnect', (reason) => {
      console.debug(`[Socket] Disconnected: ${reason}`);
    });

    // Re-attach any listeners registered before connect
    Object.entries(listenersRef.current).forEach(([event, handler]) => {
      socket.on(event, handler as (...args: unknown[]) => void);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, autoConnect]);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    listenersRef.current[event] = handler;
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    delete listenersRef.current[event];
    socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return { socket: socketRef.current, on, off, emit };
}
