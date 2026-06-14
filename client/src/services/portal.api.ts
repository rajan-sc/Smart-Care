import api from './api';
import type { MedicationLog, Vital, Appointment, QueueToken, PatientDashboardData, DoctorDashboardData, CaregiverLink, Notification } from '../types/api';

// ── User ──────────────────────────────────────────────────────────────────────
export const userApi = {
  updateProfile: (payload: { firstName?: string; lastName?: string; phone?: string }) =>
    api.put<{ success: boolean; data: any }>('/users/me', payload),
};

// ── Patient ───────────────────────────────────────────────────────────────────
export const patientApi = {
  getDashboard: (date: string) =>
    api.get<{ success: boolean; data: PatientDashboardData }>(`/analytics/dashboard?date=${date}`),

  getMedicines: () =>
    api.get<{ success: boolean; data: any[] }>('/medicines'),

  uploadRecord: (data: FormData) =>
    api.post('/records', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getMyRecords: () =>
    api.get('/records'),

  deleteRecord: (id: string) =>
    api.delete(`/records/${id}`),

  createMedicine: (payload: { name: string; dosage: string; unit: string; frequency: string; timings: string[]; startDate: string; instructions?: string }) =>
    api.post<{ success: boolean; data: any }>('/medicines', payload),

  updateMedicine: (id: string, payload: { name: string; dosage: string; unit: string; frequency: string; timings: string[]; startDate: string; instructions?: string }) =>
    api.put<{ success: boolean; data: any }>(`/medicines/${id}`, payload),

  deleteMedicine: (id: string) =>
    api.delete<{ success: boolean }>(`/medicines/${id}`),

  getTodayMeds: () =>
    api.get<{ success: boolean; data: MedicationLog[] }>('/medicines/today'),

  markTaken: (logId: string) =>
    api.patch<{ success: boolean; data: MedicationLog }>(`/medicines/logs/${logId}/taken`),

  markSkipped: (logId: string, reason: string) =>
    api.patch<{ success: boolean; data: MedicationLog }>(`/medicines/logs/${logId}/skipped`, { reason }),

  snoozeLog: (logId: string, snoozeMinutes: number) =>
    api.patch<{ success: boolean; data: MedicationLog }>(`/medicines/logs/${logId}/snooze`, { snoozeMinutes }),

  getVitals: (limit = 20) =>
    api.get<{ success: boolean; data: Vital[] }>(`/vitals/history?limit=${limit}`),

  logVital: (payload: { vitalType: string; values: Record<string, number | string>; notes?: string }) =>
    api.post<{ success: boolean; data: Vital }>('/vitals', payload),

  getAppointments: () =>
    api.get<{ success: boolean; data: Appointment[] }>('/appointments/me'),

  getDoctors: () =>
    api.get<{ success: boolean; data: any[] }>('/doctors'),

  createAppointment: (payload: { doctorId: string; scheduledDate: string; slotStart: string; slotEnd: string; type: string; notes?: string }) =>
    api.post<{ success: boolean; data: Appointment }>('/appointments', payload),

  cancelAppointment: (id: string) =>
    api.post<{ success: boolean; data: Appointment }>(`/appointments/${id}/cancel`),

  getAdherence: (range: 7 | 30) =>
    api.get<{ success: boolean; data: { maxStreak: number; currentStreak: number; ratio: number; rangeDays: number } }>(
      `/analytics/adherence?range=${range}`
    ),

  exportData: (params: { type: string; startDate: string; endDate: string }) =>
    api.get<{ success: boolean; data: any }>('/analytics/export', { params }),

  getMyCaregivers: () =>
    api.get<{ success: boolean; data: any[] }>('/caregivers/my-caregivers'),

  linkCaregiver: (payload: { caregiverEmail: string; relationship: string; permissions: string[] }) =>
    api.post<{ success: boolean; data: any }>('/caregivers/link', payload),

  revokeCaregiverLink: (id: string) =>
    api.delete<{ success: boolean; data: any }>(`/caregivers/links/${id}`),
};
export const notificationApi = {
  getMy: () => api.get<{ success: boolean; data: Notification[] }>('/notifications'),
  getUnreadCount: () => api.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch<{ success: boolean; data: any }>(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch<{ success: boolean; data: any }>('/notifications/read-all'),
};
export const doctorApi = {
  getDoctorProfile: (id: string) =>
    api.get<{ success: boolean; data: any }>(`/doctors/${id}`),

  updateProfile: (payload: any) =>
    api.put<{ success: boolean; data: any }>('/doctors/me/profile', payload),

  getDashboard: (date: string) =>
    api.get<{ success: boolean; data: DoctorDashboardData }>(`/analytics/dashboard?date=${date}`),

  updateAvailability: (payload: { availability: any[] }) =>
    api.put<{ success: boolean; data: any }>('/doctors/me/availability', payload),

  getQueue: () =>
    api.get<{ success: boolean; data: QueueToken[] }>('/queue'),

  advanceQueue: (action: 'CALL_NEXT' | 'COMPLETE_AND_CALL_NEXT' | 'SKIP_CURRENT') =>
    api.post<{ success: boolean; data: any }>('/queue/advance', { action }),

  getPatients: () =>
    api.get<{ success: boolean; data: any[] }>('/doctors/me/patients'),

  getPatientVitals: (patientId: string) =>
    api.get<{ success: boolean; data: any[] }>(`/doctors/me/patients/${patientId}/vitals`),

  getPatientMedications: (patientId: string) =>
    api.get<{ success: boolean; data: any[] }>(`/doctors/me/patients/${patientId}/medications`),

  getPatientRecords: (patientId: string) =>
    api.get<{ success: boolean; data: any[] }>(`/doctors/me/patients/${patientId}/records`),

  updateAppointmentNotes: (appointmentId: string, payload: { clinicalNotes?: string; medicines?: any[] }) =>
    api.put<{ success: boolean; data: any }>(`/appointments/${appointmentId}/notes`, payload),
};

// ── Caregiver ─────────────────────────────────────────────────────────────────
export const caregiverApi = {
  getPatients: () =>
    api.get<{ success: boolean; data: CaregiverLink[] }>('/caregivers/patients'),

  getPatientVitals: (patientId: string) =>
    api.get<{ success: boolean; data: Vital[] }>(`/caregivers/patients/${patientId}/vitals`),

  getPatientMedications: (patientId: string) =>
    api.get<{ success: boolean; data: any[] }>(`/caregivers/patients/${patientId}/medications`),

  getPatientAppointments: (patientId: string) =>
    api.get<{ success: boolean; data: any[] }>(`/caregivers/patients/${patientId}/appointments`),

  getPatientRecords: (patientId: string, limit = 50) =>
    api.get<{ success: boolean; data: any[] }>(`/caregivers/patients/${patientId}/records?limit=${limit}`),

  updateLink: (linkId: string, status: 'ACCEPTED' | 'REJECTED') =>
    api.patch<{ success: boolean; data: any }>(`/caregivers/links/${linkId}`, { status }),
};

// ── Admin ───────────────────────────────────────────────────────────────────────
export const adminApi = {
  getAnalytics: () =>
    api.get<{ success: boolean; data: any }>('/admin/analytics'),

  getUsers: (page = 1, limit = 10, search?: string, role?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    return api.get<{ success: boolean; data: any }>(`/admin/users?${params.toString()}`);
  },

  updateUserRole: (id: string, role: string) =>
    api.patch<{ success: boolean; data: any }>(`/admin/users/${id}/role`, { role }),

  getAuditLogs: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    return api.get<{ success: boolean; data: any }>(`/admin/audit-logs?${params.toString()}`);
  },
};

// ── Shared ────────────────────────────────────────────────────────────────────
