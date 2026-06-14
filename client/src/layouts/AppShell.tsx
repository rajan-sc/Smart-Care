import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/NotificationBell';

// ─── SVG Icon helper ──────────────────────────────────────────────────────────
const Icon = ({ path, className = 'w-5 h-5' }: { path: string; className?: string }) => (
  <svg className={`flex-shrink-0 ${className}`} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

// ─── Nav definitions ──────────────────────────────────────────────────────────
interface NavItem { to: string; icon: string; label: string; }

const patientNav: NavItem[] = [
  { to: '/dashboard',    label: 'Overview',        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/medications',  label: 'Medications',     icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
  { to: '/vitals',       label: 'Vitals',          icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { to: '/appointments', label: 'Appointments',    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/records',      label: 'Medical Records', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { to: '/caregivers',   label: 'Care Team',       icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { to: '/profile',      label: 'Profile',         icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

const doctorNav: NavItem[] = [
  { to: '/doctor/dashboard', label: 'Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { to: '/doctor/queue',     label: 'Queue',     icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { to: '/doctor/schedule',  label: 'Schedule',  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/doctor/patients',  label: 'Patients',  icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { to: '/doctor/profile',   label: 'Profile',   icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

const caregiverNav: NavItem[] = [
  { to: '/caregiver/dashboard', label: 'My Patients', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
];

// ─── Shared logo mark ─────────────────────────────────────────────────────────
const LogoMark = ({ size = 'md' }: { size?: 'sm' | 'md' }) => (
  <div className={`${size === 'sm' ? 'w-8 h-8' : 'w-8 h-8'} rounded-lg bg-forest-ink flex items-center justify-center flex-shrink-0`}>
    <svg className="w-4 h-4 text-linen-white" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  </div>
);

// ─── PATIENT SIDEBAR — 256px, icon + label ────────────────────────────────────
interface PatientSidebarProps { className?: string; onNavClick?: () => void; }

const PatientSidebar: React.FC<PatientSidebarProps> = ({ className = '', onNavClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <aside className={`flex flex-col w-64 h-screen sticky top-0 overflow-y-auto overflow-x-hidden px-3 py-6 bg-linen-white border-r border-hairline-gray ${className}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <LogoMark />
        <div>
          <p className="text-forest-ink font-semibold text-sm leading-tight">Smart Care</p>
          <p className="text-xs capitalize text-charcoal">
            {user?.role?.toLowerCase()} portal
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5">
        {patientNav.map((item) => (
          <NavLink key={item.to} to={item.to}
            end={item.to.split('/').length <= 2}
            onClick={onNavClick}
            className={({ isActive }) => isActive 
              ? 'flex items-center gap-3 px-ease-11 py-ease-7 rounded-nav bg-mist-blue text-forest-ink text-ease-body-sm font-normal' 
              : 'flex items-center gap-3 px-ease-11 py-ease-7 rounded-nav text-charcoal hover:bg-mint-veil text-ease-body-sm font-normal transition-colors'
            }
          >
            <Icon path={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="pt-4 mt-4 border-t border-hairline-gray">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-mint-veil flex items-center justify-center text-forest-ink font-semibold text-xs flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="overflow-hidden">
            <p className="text-forest-ink text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs truncate text-charcoal">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-ease-11 py-ease-7 rounded-nav w-full text-left text-danger-600 hover:bg-danger-50 text-ease-body-sm transition-colors">
          <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

// ─── DOCTOR COMMAND RAIL — 56px icon-only, flat minimal style ─────────────────────
interface DoctorRailProps { onNavClick?: () => void; }

const DoctorRail: React.FC<DoctorRailProps> = ({ onNavClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <aside className="flex flex-col items-center w-14 h-screen sticky top-0 overflow-y-auto overflow-x-hidden py-4 gap-1 flex-shrink-0 bg-linen-white border-r border-hairline-gray">
      {/* Logo mark */}
      <div className="mb-4">
        <LogoMark size="sm" />
      </div>

      {/* Divider */}
      <div className="w-6 h-px mb-2 bg-hairline-gray" />

      {/* Nav icons */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {doctorNav.map((item) => (
          <NavLink key={item.to} to={item.to}
            end={item.to === '/doctor/dashboard'}
            onClick={onNavClick}
            className={({ isActive }) => isActive 
              ? 'relative flex items-center justify-center w-11 h-11 rounded-nav bg-mist-blue text-forest-ink' 
              : 'relative flex items-center justify-center w-11 h-11 rounded-nav text-charcoal hover:bg-mint-veil transition-colors'
            }
            title={item.label}
          >
            <Icon path={item.icon} />
          </NavLink>
        ))}
      </nav>

      {/* Bottom: avatar + logout */}
      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="w-8 h-8 rounded-full bg-mint-veil flex items-center justify-center text-forest-ink font-semibold text-xs cursor-default"
          title={`${user?.firstName} ${user?.lastName}`}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <button onClick={handleLogout}
          className="flex items-center justify-center w-11 h-11 rounded-nav text-danger-600 hover:bg-danger-50 transition-colors"
          title="Sign out">
          <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </button>
      </div>
    </aside>
  );
};

// ─── DOCTOR TOP BAR — clean light strip ─────────────────────────────
interface DoctorTopBarProps { isMobileMenuOpen: boolean; onMenuOpen: () => void; }

const DoctorTopBar: React.FC<DoctorTopBarProps> = ({ isMobileMenuOpen: _, onMenuOpen }) => {
  const { user } = useAuth();
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hh = time.getHours().toString().padStart(2, '0');
  const mm = time.getMinutes().toString().padStart(2, '0');
  const ss = time.getSeconds().toString().padStart(2, '0');

  return (
    <header className="flex items-center justify-between h-11 px-4 flex-shrink-0 bg-linen-white border-b border-hairline-gray">
      {/* Left — mobile hamburger (hidden on lg) */}
      <button onClick={onMenuOpen}
        className="lg:hidden p-2 text-charcoal hover:text-forest-ink mr-2"
        aria-label="Open menu">
        <Icon path="M4 6h16M4 12h16M4 18h16" />
      </button>

      {/* Center — breadcrumb / context */}
      <div className="flex-1" />

      {/* Right — live clock + user */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm tracking-tight text-charcoal hidden sm:block">
          {hh}:{mm}:{ss}
        </span>
        <div className="h-4 w-px bg-hairline-gray" />
        <span className="text-xs text-charcoal">
          Dr. {user?.lastName}
        </span>
      </div>
    </header>
  );
};

// ─── APP SHELL ────────────────────────────────────────────────────────────────
export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isDoctor = user?.role === 'DOCTOR';

  const handleLogout = async () => { await logout(); navigate('/login'); };

  // ── UNIFIED LAYOUT ────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-linen-white">
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-true-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300
        lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {user?.role === 'CAREGIVER' || user?.role === 'DOCTOR' ? (
          <aside className="flex flex-col w-64 h-screen sticky top-0 overflow-y-auto overflow-x-hidden px-3 py-6 bg-linen-white border-r border-hairline-gray">
            <div className="flex items-center gap-3 px-3 mb-8">
              <LogoMark />
              <div>
                <p className="text-forest-ink font-semibold text-sm">Smart Care</p>
                <p className="text-xs capitalize text-charcoal">{user.role.toLowerCase()} portal</p>
              </div>
            </div>
            <nav className="flex-1 flex flex-col gap-0.5">
              {(user.role === 'CAREGIVER' ? caregiverNav : doctorNav).map((item) => (
                <NavLink key={item.to} to={item.to}
                  end={item.to === '/doctor/dashboard'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => isActive 
                    ? 'flex items-center gap-3 px-ease-11 py-ease-7 rounded-nav bg-mist-blue text-forest-ink text-ease-body-sm font-normal' 
                    : 'flex items-center gap-3 px-ease-11 py-ease-7 rounded-nav text-charcoal hover:bg-mint-veil text-ease-body-sm font-normal transition-colors'
                  }>
                  <Icon path={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User footer */}
            <div className="pt-4 mt-4 border-t border-hairline-gray">
              <div className="flex items-center gap-3 px-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-mint-veil flex items-center justify-center text-forest-ink font-semibold text-xs flex-shrink-0">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="overflow-hidden">
                  <p className="text-forest-ink text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs truncate text-charcoal">{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-ease-11 py-ease-7 rounded-nav w-full text-left text-danger-600 hover:bg-danger-50 text-ease-body-sm transition-colors">
                <Icon path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        ) : (
          <PatientSidebar onNavClick={() => setIsMobileMenuOpen(false)} />
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-linen-white border-b border-hairline-gray sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="font-semibold text-forest-ink">Smart Care</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 text-charcoal hover:bg-mint-veil rounded-nav min-h-[44px] min-w-[44px]
              flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-ink"
            aria-label="Open navigation menu">
            <Icon path="M4 6h16M4 12h16M4 18h16" />
          </button>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Global Floating Action Button for Notifications */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <NotificationBell />
      </div>
    </div>
  );
};

// Re-export Sidebar for cases where it's needed standalone
export const Sidebar = PatientSidebar;
