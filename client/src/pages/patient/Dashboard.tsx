import React, { useState, useMemo, Suspense } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AppShell } from '../../layouts/AppShell';
import { useAuth } from '../../context/AuthContext';
import { patientApi } from '../../services/portal.api';
import type { MedicationLog } from '../../types/api';

import { VitalsChart } from '../../components/VitalsChart';
import { AdherenceStreak } from '../../components/AdherenceStreak';
import { ExportModal } from '../../components/ExportModal';

// ─── Mini Components ──────────────────────────────────────────────────────────

const HealthPulseBanner: React.FC = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: dashData } = useSuspenseQuery({
    queryKey: ['dashboard', 'patient', today],
    queryFn: () => patientApi.getDashboard(today).then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const { data: meds } = useSuspenseQuery({
    queryKey: ['meds', 'today'],
    queryFn: () => patientApi.getTodayMeds().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const { data: appointments } = useSuspenseQuery({
    queryKey: ['appointments'],
    queryFn: () => patientApi.getAppointments().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const takenCount  = meds?.filter((m) => m.status === 'TAKEN').length  ?? 0;
  const totalMeds   = meds?.length ?? 0;
  const nextAppt = appointments?.find(
    (a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.scheduledDate) >= new Date()
  );

  return (
    <div className="card p-0 overflow-hidden bg-linen-white animate-fade-in border border-hairline-gray">
      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 p-ease-21 border-b lg:border-b-0 lg:border-r border-hairline-gray flex items-center justify-between hover:bg-mint-veil transition-colors">
          <div>
            <p className="text-charcoal text-ease-caption mb-ease-4">Adherence</p>
            <div className="flex items-baseline gap-ease-7">
              <span className="text-ease-heading-sm font-mono text-forest-ink tracking-tight">{Math.round(dashData.adherenceRate)}%</span>
              {totalMeds > 0 && <span className="text-ease-caption text-forest-ink tracking-wide">↑ {takenCount}/{totalMeds}</span>}
            </div>
          </div>
        </div>
        <div className="flex-1 p-ease-21 border-b lg:border-b-0 lg:border-r border-hairline-gray flex items-center justify-between hover:bg-mint-veil transition-colors">
          <div>
            <p className="text-charcoal text-ease-caption mb-ease-4">Delayed Doses</p>
            <div className="flex items-baseline gap-ease-7">
              <span className="text-ease-heading-sm font-mono text-forest-ink tracking-tight">{dashData.delayedDoses}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 p-ease-21 border-b lg:border-b-0 lg:border-r border-hairline-gray flex items-center justify-between hover:bg-mint-veil transition-colors">
          <div>
            <p className="text-charcoal text-ease-caption mb-ease-4">Vitals Logged</p>
            <div className="flex items-baseline gap-ease-7">
              <span className="text-ease-heading-sm font-mono text-forest-ink tracking-tight">{dashData.vitalsCount}</span>
            </div>
          </div>
        </div>
        <div className="flex-[1.25] p-ease-21 flex flex-col justify-center bg-mist-blue/20 hover:bg-mist-blue/40 transition-colors">
           <p className="text-forest-ink text-ease-caption mb-ease-4 flex items-center gap-ease-7">
              Next Appointment
           </p>
           {nextAppt ? (
              <div className="flex items-baseline gap-ease-7 mt-1">
                <span className="text-ease-heading-sm font-mono text-forest-ink tracking-tight">
                  {format(parseISO(nextAppt.scheduledDate), 'MMM d')}
                </span>
                <span className="text-ease-caption text-forest-ink">
                  {format(parseISO(nextAppt.scheduledDate), 'h:mm a')}
                </span>
              </div>
           ) : (
              <span className="text-ease-body-sm text-forest-ink mt-1">None Scheduled</span>
           )}
        </div>
      </div>
    </div>
  );
};

const MedRow: React.FC<{
  log: MedicationLog;
  onTaken: (id: string) => void;
  isPending: boolean;
}> = ({ log, onTaken, isPending }) => {
  const time = format(parseISO(log.scheduledAt), 'h:mm a');
  const isTaken = log.status === 'TAKEN';
  const isMissed = log.status === 'MISSED';

  return (
    <div className={`flex items-center gap-ease-14 p-ease-14 rounded-cards border transition-all duration-300
      ${isTaken ? 'bg-mint-veil/50 border-mint-veil' : isMissed ? 'bg-danger-50 border-danger-100' : 'bg-linen-white border-hairline-gray hover:bg-mint-veil hover:border-forest-ink'}`}>

      {/* Checkbox */}
      <button
        onClick={() => !isTaken && !isMissed && onTaken(log.id)}
        disabled={isTaken || isMissed || isPending}
        className={`w-7 h-7 rounded-buttons border flex items-center justify-center flex-shrink-0 transition-all duration-300
          ${isTaken ? 'bg-forest-ink border-forest-ink' : 'border-hairline-gray hover:border-forest-ink'}`}
        aria-label={isTaken ? 'Taken' : 'Mark as taken'}
      >
        {isTaken && (
          <svg className="w-4 h-4 text-linen-white animate-fade-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-ease-body-sm font-normal truncate transition-colors ${isTaken ? 'text-charcoal line-through opacity-70' : 'text-forest-ink'}`}>
          {log.medicine?.name}
        </p>
        <p className="text-ease-caption text-charcoal mt-0.5">{log.medicine?.dosage} {log.medicine?.unit}</p>
      </div>

      {/* Time & Status */}
      <div className="text-right flex-shrink-0">
        <p className="text-ease-body-sm font-mono text-forest-ink">{time}</p>
        <span className={`badge-pill mt-1.5 ${
          isTaken   ? 'bg-mint-veil text-forest-ink' :
          isMissed  ? 'bg-danger-100 text-danger-700'  :
          log.status === 'SNOOZED' ? 'bg-linen text-charcoal' : 'bg-hairline-gray text-charcoal'
        }`}>
          {log.status.toLowerCase()}
        </span>
      </div>
    </div>
  );
};

const TodayMeds: React.FC = () => {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const { data: meds } = useSuspenseQuery({
    queryKey: ['meds', 'today'],
    queryFn: () => patientApi.getTodayMeds().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const markTakenMutation = useMutation({
    mutationFn: (logId: string) => patientApi.markTaken(logId),
    onMutate: (logId) => {
      setPendingIds((prev) => new Set(prev).add(logId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meds'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onSettled: (_, __, logId) => {
      setPendingIds((prev) => {
        const s = new Set(prev);
        s.delete(logId);
        return s;
      });
    },
  });

  const pendingMeds = useMemo(() =>
    meds?.filter((m) => m.status === 'PENDING' || m.status === 'SNOOZED') ?? [],
    [meds]
  );

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-ease-21">
        <h3 className="text-ease-subheading font-display text-forest-ink tracking-tight">Today's Medications</h3>
        <span className="badge-pill">{pendingMeds.length} pending</span>
      </div>

      {meds && meds.length > 0 ? (
        <div className="flex flex-col gap-ease-7 flex-1 overflow-y-auto">
          {meds.map((log) => (
            <MedRow
              key={log.id}
              log={log}
              onTaken={(id) => markTakenMutation.mutate(id)}
              isPending={pendingIds.has(log.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-charcoal bg-linen/50 rounded-cards border border-hairline-gray p-ease-28">
          <p className="text-ease-body-sm font-normal">No medications scheduled for today</p>
        </div>
      )}
    </div>
  );
};

const VitalsChartSection: React.FC = () => {
  const { data: vitals } = useSuspenseQuery({
    queryKey: ['vitals'],
    queryFn: () => patientApi.getVitals(28).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="card h-full flex flex-col">
       <h3 className="text-ease-subheading font-display text-forest-ink tracking-tight mb-ease-21">Vitals Trend</h3>
       <div className="flex-1 min-h-[300px]">
          <VitalsChart vitals={vitals} />
       </div>
    </div>
  );
};

const NextAppointmentDetail: React.FC = () => {
  const { data: appointments } = useSuspenseQuery({
    queryKey: ['appointments'],
    queryFn: () => patientApi.getAppointments().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const nextAppt = appointments?.find(
    (a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.scheduledDate) >= new Date()
  );

  if (!nextAppt) return null;

  return (
    <div className="card animate-fade-in mt-ease-section">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-ease-21">
        <div className="flex-1">
          <p className="font-display text-ease-subheading text-forest-ink tracking-tight mb-ease-7">
            Upcoming: Dr. {nextAppt.doctor?.firstName} {nextAppt.doctor?.lastName}
          </p>
          <p className="text-ease-body-sm text-charcoal flex items-center gap-ease-14">
            <span className="font-mono">{format(parseISO(nextAppt.scheduledDate), 'EEEE, MMMM d yyyy')}</span>
            <span>—</span>
            <span className="font-mono">{format(parseISO(nextAppt.scheduledDate), 'h:mm a')}</span>
          </p>
          {nextAppt.notes && (
            <p className="text-ease-body-sm text-charcoal mt-ease-14 p-ease-14 bg-mist-blue/20 rounded-cards">{nextAppt.notes}</p>
          )}
        </div>
        <span className={`badge-pill ${nextAppt.status === 'CONFIRMED' ? 'bg-mint-veil text-forest-ink' : 'bg-hairline-gray text-charcoal'}`}>
          {nextAppt.status}
        </span>
      </div>
    </div>
  );
};

// ─── Patient Dashboard Page ───────────────────────────────────────────────────
const PatientDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-6xl mx-auto">
        {/* Header - Signature Styling */}
        <div className="mb-ease-section animate-fade-in flex flex-col sm:flex-row sm:items-end justify-between gap-ease-14">
          <div className="flex flex-col items-start">
            <span className="badge-pill mb-ease-14">Overview</span>
            <h1 className="text-ease-display font-display tracking-tight text-forest-ink">
              Good {getGreeting()}, {user?.firstName}
            </h1>
            <p className="text-charcoal font-normal text-ease-body mt-ease-14">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          
          <button 
            onClick={() => setShowExportModal(true)} 
            className="px-5 py-2.5 bg-linen text-forest-ink border border-hairline-gray rounded-nav hover:bg-mist-blue/30 transition-colors flex items-center gap-2 text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Report
          </button>
        </div>

        {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}

        {/* Adherence Streak */}
        <div className="mb-ease-section">
          <AdherenceStreak range={7} />
        </div>

        {/* Health Pulse Banner */}
        <div className="mb-ease-section">
          <Suspense fallback={<div className="skeleton h-32 w-full rounded-cards" />}>
            <HealthPulseBanner />
          </Suspense>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-ease-28">
          <div className="animate-fade-in">
            <Suspense fallback={<div className="skeleton h-96 w-full rounded-cards" />}>
              <TodayMeds />
            </Suspense>
          </div>
          <div className="animate-fade-in">
            <Suspense fallback={<div className="skeleton h-96 w-full rounded-cards" />}>
              <VitalsChartSection />
            </Suspense>
          </div>
        </div>

        {/* Next Appointment Detail */}
        <Suspense fallback={<div className="skeleton h-24 w-full rounded-cards mt-ease-section" />}>
          <NextAppointmentDetail />
        </Suspense>
      </div>
    </AppShell>
  );
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default PatientDashboardPage;
