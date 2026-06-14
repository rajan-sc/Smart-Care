import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AppShell } from '../../layouts/AppShell';
import { caregiverApi } from '../../services/portal.api';
import { useSocket } from '../../hooks/useSocket';
import { useToast } from '../../components/ToastProvider';
import type { CaregiverLink, Notification } from '../../types/api';

// ─── Alert Types ──────────────────────────────────────────────────────────────
type AlertLevel = 'ok' | 'warn' | 'critical';

interface PatientAlert {
  patientId: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
}

// ─── Status Indicator ─────────────────────────────────────────────────────────
const HealthDot: React.FC<{ level: AlertLevel }> = ({ level }) => {
  const classes = {
    ok:       'bg-success-500',
    warn:     'bg-warning-500',
    critical: 'bg-danger-500',
  };
  return (
    <span className="relative flex h-3.5 w-3.5">
      {level !== 'ok' && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${classes[level]}`} />
      )}
      <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${classes[level]}`} />
    </span>
  );
};

// ─── Patient Card ─────────────────────────────────────────────────────────────
const PatientCard: React.FC<{
  link: CaregiverLink;
  alert: PatientAlert | undefined;
}> = ({ link, alert }) => {
  const navigate = useNavigate();
  const level = alert?.level ?? 'ok';
  const patient = link.patient;
  if (!patient) return null;

  return (
    <div 
      onClick={() => navigate(`/caregiver/patients/${link.patientId}`)}
      className={`card p-6 transition-all duration-300 cursor-pointer bg-white h-full flex flex-col
      ${level === 'critical' ? 'border-danger-300 shadow-xl shadow-danger-500/10 ring-1 ring-danger-200 hover:-translate-y-1' :
        level === 'warn'     ? 'border-warning-300 shadow-lg shadow-warning-500/10 ring-1 ring-warning-200 hover:-translate-y-1' :
                               'border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 hover:border-teal-200 hover:-translate-y-1'}`}
    >
      <div className="flex items-start justify-between mb-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm
            ${level === 'critical' ? 'bg-danger-100 text-danger-700' : 
              level === 'warn' ? 'bg-warning-100 text-warning-700' : 'bg-teal-50 text-teal-700'}`}>
            <span className="font-bold text-lg">
              {patient.firstName[0]}{patient.lastName[0]}
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">{link.patient?.firstName} {link.patient?.lastName}</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{patient.email}</p>
          </div>
        </div>
        <HealthDot level={level} />
      </div>

      {/* Permissions */}
      <div className="flex flex-wrap gap-2 mb-4 flex-1">
        {link.permissions.map((perm) => (
          <span key={perm} className="px-2 py-1 bg-slate-50 text-slate-600 rounded border border-slate-100 text-2xs font-bold uppercase tracking-wider">
            {perm.replace('_', ' ').toLowerCase()}
          </span>
        ))}
      </div>

      {/* Alert message */}
      <div className="mt-auto">
        {alert ? (
          <div className={`rounded-xl px-4 py-3 text-sm font-medium flex gap-3 items-start
            ${level === 'critical' ? 'bg-danger-50 text-danger-700 border border-danger-100' :
              'bg-warning-50 text-warning-700 border border-warning-100'}`}
          >
            <span className="mt-0.5">{level === 'critical' ? '🚨' : '⚠️'}</span>
            <div className="flex-1">
              <span className="block mb-0.5">{alert.message}</span>
              <span className="block text-xs opacity-70 font-bold uppercase tracking-widest">
                {format(alert.timestamp, 'h:mm a')}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 bg-success-50/50 border border-success-100 text-xs text-success-700 font-bold uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            All vitals normal
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Notification Toast ────────────────────────────────────────────────────────
const AlertToast: React.FC<{ notification: Notification; onDismiss: () => void }> = ({
  notification, onDismiss
}) => (
  <div className="fixed bottom-8 right-8 max-w-sm w-full bg-white rounded-2xl border border-danger-200 shadow-2xl shadow-danger-500/20 p-5 animate-slide-up z-50">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-danger-100 flex items-center justify-center flex-shrink-0 text-xl shadow-inner">
        🚨
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-bold text-slate-800 text-sm tracking-tight">{notification.title}</p>
        <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">{notification.message}</p>
      </div>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-50 hover:bg-slate-100 rounded-lg">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  </div>
);

// ─── Data Components ──────────────────────────────────────────────────────────

const PatientGrid: React.FC<{ 
  alerts: Map<string, PatientAlert>;
  setAlerts: React.Dispatch<React.SetStateAction<Map<string, PatientAlert>>>;
}> = ({ alerts, setAlerts }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: patients } = useSuspenseQuery({
    queryKey: ['caregiver-patients'],
    queryFn:  () => caregiverApi.getPatients().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  // Seed alerts from database
  useEffect(() => {
    if (patients) {
      setAlerts((prev) => {
        const next = new Map(prev);
        let changed = false;
        patients.forEach(link => {
          if (link.latestAlert && !prev.has(link.patientId)) {
            const isCritical = link.latestAlert.title.toLowerCase().includes('critical');
            next.set(link.patientId, {
              patientId: link.patientId,
              level: isCritical ? 'critical' : 'warn',
              message: link.latestAlert.message,
              timestamp: new Date(link.latestAlert.createdAt),
            });
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [patients, setAlerts]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'REJECTED' }) =>
      caregiverApi.updateLink(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-patients'] });
      showToast(variables.status === 'ACCEPTED' ? 'Patient added to your Care Team' : 'Invitation declined', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error?.message || 'Failed to update invitation status', 'error');
    }
  });

  const acceptedLinks = patients?.filter((p) => p.status === 'ACCEPTED') ?? [];
  const pendingLinks = patients?.filter((p) => p.status === 'PENDING') ?? [];

  return (
    <>
      {/* Patient Grid */}
      {acceptedLinks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
          {acceptedLinks.map((link, i) => (
            <div key={link.id} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <PatientCard
                link={link}
                alert={alerts.get(link.patientId)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-16 mt-6 border-dashed border-2 border-slate-200 bg-slate-50/50 text-center animate-fade-in">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <span className="text-4xl">🔗</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No linked patients yet</h3>
          <p className="text-slate-500 font-medium">Ask a patient to add you as their caregiver to start monitoring.</p>
        </div>
      )}

      {/* Pending Requests */}
      {pendingLinks.length > 0 && (
        <div className="mt-10 animate-fade-in animate-delay-300">
          <h3 className="mb-4 font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-warning-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Pending Invitations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingLinks.map((link) => (
              <div key={link.id} className="card p-5 flex items-center gap-4 bg-white shadow-sm border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center text-warning-600 shadow-inner">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="font-bold text-slate-800 tracking-tight">
                    {link.patient?.firstName} {link.patient?.lastName}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Invited you to their care team</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button 
                    onClick={() => updateStatusMutation.mutate({ id: link.id, status: 'REJECTED' })}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={() => updateStatusMutation.mutate({ id: link.id, status: 'ACCEPTED' })}
                    disabled={updateStatusMutation.isPending}
                    className="px-4 py-1.5 rounded-lg bg-forest-ink text-linen-white text-xs font-bold uppercase tracking-widest hover:bg-forest-ink/90 transition-colors disabled:opacity-50"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};


// ─── Caregiver Dashboard ──────────────────────────────────────────────────────
const CaregiverDashboardPage: React.FC = () => {
  const [alerts, setAlerts]         = useState<Map<string, PatientAlert>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const { showToast } = useToast();

  // ── Socket ───────────────────────────────────────────────────────────────────
  const { on, off, socket } = useSocket({ namespace: '/' });

  useEffect(() => {
    setIsConnected(socket?.connected ?? false);
  }, [socket]);

  useEffect(() => {
    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const handleNotification = (data: unknown) => {
      const notif = data as Notification;
      if (notif.type === 'CAREGIVER_ALERT' || notif.type === 'VITAL_ALERT') {
        const patientId = (notif.metadata?.patientId as string) ?? '';
        const isCritical = notif.title.toLowerCase().includes('critical');

        setAlerts((prev) => {
          const next = new Map(prev);
          next.set(patientId, {
            patientId,
            level: isCritical ? 'critical' : 'warn',
            message: notif.message,
            timestamp: new Date(),
          });
          return next;
        });

        showToast(notif.message, isCritical ? 'error' : 'warning');
      }
    };

    on('connect',          onConnect    as (...args: unknown[]) => void);
    on('disconnect',       onDisconnect as (...args: unknown[]) => void);
    on('notification:new', handleNotification);

    return () => {
      off('connect',          onConnect    as (...args: unknown[]) => void);
      off('disconnect',       onDisconnect as (...args: unknown[]) => void);
      off('notification:new', handleNotification);
    };
  }, [on, off]);

  const criticalCount = Array.from(alerts.values()).filter((a) => a.level === 'critical').length;
  const warnCount     = Array.from(alerts.values()).filter((a) => a.level === 'warn').length;

  return (
    <AppShell>
      <div className="page-container py-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-fade-in">
          <div>
            <h1 className="text-4xl font-display font-semibold tracking-tight text-slate-900 mb-2">Patient Monitor</h1>
            <p className="text-slate-500 font-medium">Real-time status of your linked patients</p>
          </div>
          <div className="flex items-center flex-wrap gap-3">
            {criticalCount > 0 && (
              <span className="badge badge-danger text-sm px-4 py-2 font-bold uppercase tracking-widest shadow-sm border border-danger-200">
                🚨 {criticalCount} critical
              </span>
            )}
            {warnCount > 0 && (
              <span className="badge badge-warning text-sm px-4 py-2 font-bold uppercase tracking-widest shadow-sm border border-warning-200">
                ⚠️ {warnCount} alerts
              </span>
            )}
          </div>
        </div>

        <Suspense fallback={
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-[280px] rounded-2xl" />)}
          </div>
        }>
          <PatientGrid alerts={alerts} setAlerts={setAlerts} />
        </Suspense>

      </div>
    </AppShell>
  );
};

export default CaregiverDashboardPage;
