import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  allowedRoles?: Role[];
  redirectTo?: string;
  children?: React.ReactNode;
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────
const AuthLoadingScreen: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-linen-white">
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {/* Animated logo mark */}
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-forest-ink flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 text-linen-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-2xl border-2 border-forest-ink/30 animate-ping" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-graphite">Loading Smart Care…</p>
    </div>
  </div>
);

// ─── Role-Based Redirect Helper ───────────────────────────────────────────────
const getRoleDefaultPath = (role: Role): string => {
  switch (role) {
    case 'PATIENT':   return '/dashboard';
    case 'DOCTOR':    return '/doctor/dashboard';
    case 'CAREGIVER': return '/caregiver/dashboard';
    case 'ADMIN':     return '/admin';
    default:          return '/login';
  }
};

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectTo = '/login',
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading screen while session is being restored
  if (isLoading) return <AuthLoadingScreen />;

  // Not authenticated → redirect to login, preserving destination
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Role not permitted → redirect to the user's correct portal
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleDefaultPath(user.role)} replace />;
  }

  // Render children or nested routes via Outlet
  return children ? <>{children}</> : <Outlet />;
};

// ─── GuestRoute (Redirect if already authenticated) ───────────────────────────
export const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <AuthLoadingScreen />;

  // Already logged in → send to their dashboard
  if (isAuthenticated && user) {
    return <Navigate to={getRoleDefaultPath(user.role)} replace />;
  }

  return <>{children}</>;
};
