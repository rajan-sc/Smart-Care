

// ── Auth Pages ────────────────────────────────────────────────────────────────
export { LoginPage } from './auth/Login';
export { RegisterPage } from './auth/Register';
export { ForgotPasswordPage } from './auth/ForgotPassword';
export { ResetPasswordPage } from './auth/ResetPassword';
export { VerifyEmailPage } from './auth/VerifyEmail';

// ── Patient Pages ─────────────────────────────────────────────────────────────
export { VitalsPage } from './patient/Vitals';
export { MedicationsPage } from './patient/Medications';
export { AppointmentsPage } from './patient/Appointments';
export { MedicalRecordsPage as MedicalRecords } from './patient/MedicalRecords';
export { ProfilePage } from './patient/Profile';
export { PaymentStatusPage } from './patient/PaymentStatus';

// ── Doctor Pages ──────────────────────────────────────────────────────────────
export { DoctorSchedule } from './doctor/Schedule';
export { DoctorQueue } from './doctor/Queue';
export { DoctorPatients } from './doctor/Patients';

// ── Caregiver Pages ───────────────────────────────────────────────────────────
export { PatientDetail as CaregiverPatientDetail } from './caregiver/PatientDetail';

// ── Admin Pages ───────────────────────────────────────────────────────────────
// AdminDashboard is lazy-loaded directly in App.tsx

// ── Public Pages ──────────────────────────────────────────────────────────────
export { LandingPage } from './public/Landing';
export { DoctorsPage } from './public/Doctors';
export { NotFoundPage } from './public/NotFound';
