import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '../services/api';
import { storage } from '../utils/storage';
import { socketService } from '../services/socket';

// ─── Types ────────────────────────────────────────────────────────────────────
export type Role = 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
}

// Declared at module level (not inside component) to avoid esbuild JSX ambiguity
export type UserPartial = { [K in keyof User]?: User[K] };

interface LoginPayload    { email: string; password: string; }
interface RegisterPayload { email: string; password: string; firstName: string; lastName: string; role: Role; phone?: string; }

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login:      (payload: LoginPayload)    => Promise<void>;
  logout:     ()                         => Promise<void>;
  register:   (payload: RegisterPayload) => Promise<void>;
  updateUser: (partial: UserPartial)     => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user,      setUser]      = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Session Restore ───────────────────────────────────────────────────────
  useEffect(() => {
    const restore = async () => {
      const storedUser  = storage.get('user')  as User | null;
      const accessToken = storage.get('accessToken') as string | null;

      if (!storedUser || !accessToken) { setIsLoading(false); return; }

      try {
        const res = await api.get('/auth/me');
        const freshUser = res.data.data as User;
        storage.set('user', freshUser);
        setUser(freshUser);
        socketService.connect();
      } catch {
        storage.clear('accessToken', 'refreshToken', 'user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restore();

    const onForceLogout = () => { setUser(null); setIsLoading(false); };
    window.addEventListener('auth:logout', onForceLogout);
    return () => window.removeEventListener('auth:logout', onForceLogout);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (payload: LoginPayload) => {
    const res = await api.post('/auth/login', payload);
    const { user: u, accessToken, refreshToken } = res.data.data as { user: User; accessToken: string; refreshToken: string; };

    storage.set('accessToken', accessToken);
    storage.set('refreshToken', refreshToken);
    storage.set('user', u);
    api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
    setUser(u);
    socketService.connect();
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await api.post('/auth/register', payload);
    const { user: u, accessToken, refreshToken } = res.data.data as { user: User; accessToken: string; refreshToken: string; };

    storage.set('accessToken', accessToken);
    storage.set('refreshToken', refreshToken);
    storage.set('user', u);
    api.defaults.headers.common['Authorization'] = 'Bearer ' + accessToken;
    setUser(u);
    socketService.connect();
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      const rt = storage.get('refreshToken') as string | null;
      if (rt) await api.post('/auth/logout', { token: rt });
    } catch { /* ignore */ }
    finally {
      delete api.defaults.headers.common['Authorization'];
      storage.clear('accessToken', 'refreshToken', 'user');
      setUser(null);
      socketService.disconnect();
      window.location.replace('/login');
    }
  }, []);

  // ── Update User ───────────────────────────────────────────────────────────
  const updateUser = useCallback((partial: UserPartial) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = Object.assign({}, prev, partial) as User;
      storage.set('user', updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, register, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
