import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmProvider';
import { LoginPage } from './pages/auth/Login';
import { RegisterPage } from './pages/auth/Register';
import { ForgotPasswordPage } from './pages/auth/ForgotPassword';
import { ResetPasswordPage } from './pages/auth/ResetPassword';
import { VerifyEmailPage } from './pages/auth/VerifyEmail';
import { DoctorsPage } from './pages/public/Doctors';
import { LandingPage } from './pages/public/Landing';
import { NotFoundPage } from './pages/public/NotFound';

// Lazy-load portal pages to split chunks
const VitalsPage = lazy(() => import('./pages/patient/Vitals').then(m => ({ default: m.VitalsPage })));
const MedicationsPage = lazy(() => import('./pages/patient/Medications').then(m => ({ default: m.MedicationsPage })));
const AppointmentsPage = lazy(() => import('./pages/patient/Appointments').then(m => ({ default: m.AppointmentsPage })));
const ProfilePage = lazy(() => import('./pages/patient/Profile').then(m => ({ default: m.ProfilePage })));
const PaymentStatusPage = lazy(() => import('./pages/patient/PaymentStatus').then(m => ({ default: m.PaymentStatusPage })));
const MedicalRecords = lazy(() => import('./pages/patient/MedicalRecords').then(m => ({ default: m.MedicalRecordsPage })));
const CaregiversPage = lazy(() => import('./pages/patient/Caregivers').then(m => ({ default: m.Caregivers })));

const DoctorSchedule = lazy(() => import('./pages/doctor/Schedule').then(m => ({ default: m.DoctorSchedule })));
const DoctorQueue = lazy(() => import('./pages/doctor/Queue').then(m => ({ default: m.DoctorQueue })));
const DoctorPatients = lazy(() => import('./pages/doctor/Patients').then(m => ({ default: m.Patients })));
const DoctorPatientDetail = lazy(() => import('./pages/doctor/PatientDetail').then(m => ({ default: m.PatientDetail })));
const DoctorProfile = lazy(() => import('./pages/doctor/Profile').then(m => ({ default: m.DoctorProfilePage })));

const CaregiverPatientDetail = lazy(() => import('./pages/caregiver/PatientDetail').then(m => ({ default: m.PatientDetail })));

// Lazy-load heavy dashboard pages for better initial load time
const PatientDashboard   = lazy(() => import('./pages/patient/Dashboard'));
const DoctorDashboard    = lazy(() => import('./pages/doctor/Dashboard'));
const CaregiverDashboard = lazy(() => import('./pages/caregiver/Dashboard'));
const AdminDashboard     = lazy(() => import('./pages/admin/Dashboard'));

// ─── React Query Client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,
      gcTime:               5 * 60_000,
      retry:                1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

// ─── Suspense Fallback ────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-25">
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>

                {/* ── Public Routes ────────────────────────────────────────── */}
                <Route path="/doctors" element={<DoctorsPage />} />

                {/* ── Guest-Only ───────────────────────────────────────────── */}
                <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
                <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
                <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />

                {/* ── Patient Portal ─────────────────────────────────────────── */}
                <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
                  <Route path="/dashboard"    element={<PatientDashboard />} />
                  <Route path="/vitals"       element={<VitalsPage />} />
                  <Route path="/medications"  element={<MedicationsPage />} />
                  <Route path="/appointments" element={<AppointmentsPage />} />
                  <Route path="/records"      element={<MedicalRecords />} />
                  <Route path="/caregivers"   element={<CaregiversPage />} />
                  <Route path="/profile"      element={<ProfilePage />} />
                </Route>
                <Route path="/payment-status" element={<ProtectedRoute allowedRoles={['PATIENT']}><PaymentStatusPage /></ProtectedRoute>} />

                {/* ── Doctor Portal ───────────────────────────────────────────── */}
                <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
                  <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                  <Route path="/doctor/schedule"  element={<DoctorSchedule />} />
                  <Route path="/doctor/queue"     element={<DoctorQueue />} />
                  <Route path="/doctor/patients"  element={<DoctorPatients />} />
                  <Route path="/doctor/patients/:id" element={<DoctorPatientDetail />} />
                  <Route path="/doctor/profile"   element={<DoctorProfile />} />
                </Route>

                {/* ── Caregiver Portal ────────────────────────────────────────── */}
                <Route element={<ProtectedRoute allowedRoles={['CAREGIVER']} />}>
                  <Route path="/caregiver/dashboard" element={<CaregiverDashboard />} />
                  <Route path="/caregiver/patients/:id" element={<CaregiverPatientDetail />} />
                </Route>

                {/* ── Admin ─────────────────────────────────────────────────────── */}
                <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                {/* ── Root & 404 ────────────────────────────────────────────────── */}
                <Route path="/"  element={<LandingPage />} />
                <Route path="*"  element={<NotFoundPage />} />

              </Routes>
            </Suspense>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
}

export default App;
