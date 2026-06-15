import React, { useState, useEffect, Suspense } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AppShell } from '../../layouts/AppShell';
import { useAuth } from '../../context/AuthContext';
import { doctorApi } from '../../services/portal.api';
import { useSocket } from '../../hooks/useSocket';
import type { QueueToken } from '../../types/api';

// ─── Stat tile for the summary row ───────────────────────────────────────────
const StatTile: React.FC<{ label: string; value: string | number; sub?: string }> = ({ label, value, sub }) => (
  <div className="card hover:bg-mint-veil transition-colors duration-300">
    <p className="text-ease-caption text-charcoal mb-ease-7 uppercase tracking-tight">{label}</p>
    <div className="flex items-baseline gap-ease-7">
      <p className="font-mono text-ease-heading-sm font-normal text-forest-ink tracking-tight">{value}</p>
      {sub && <p className="text-ease-caption text-charcoal">{sub}</p>}
    </div>
  </div>
);

// ─── Queue row (compact for dashboard) ───────────────────────────────────────
const MiniQueueRow: React.FC<{ token: QueueToken; isActive: boolean; isFlashing: boolean }> = ({
  token, isActive, isFlashing,
}) => {
  const isWaiting = token.status === 'WAITING';
  
  return (
    <div className={`flex items-center gap-ease-14 px-ease-21 py-ease-14 transition-colors duration-300 border-b border-hairline-gray last:border-0
      ${isFlashing ? 'bg-mint-veil' : isActive ? 'bg-mist-blue/30' : 'hover:bg-mint-veil'}
    `}>
      <span className="font-mono text-ease-body-sm text-charcoal w-ease-28 flex-shrink-0">
        #{String(token.tokenNumber).padStart(2, '0')}
      </span>
      <span className={`flex-1 text-ease-body-sm truncate ${isActive ? 'text-forest-ink font-semibold' : 'text-forest-ink'}`}>
        {token.patient?.firstName} {token.patient?.lastName}
      </span>
      {token.estimatedWaitMinutes != null && isWaiting && (
        <span className="font-mono text-ease-caption text-charcoal bg-linen px-ease-7 py-ease-4 rounded-badges">
          ~{token.estimatedWaitMinutes}m
        </span>
      )}
    </div>
  );
};

// ─── Extracted Data Components ────────────────────────────────────────────────
const StatsRow: React.FC = () => {
  const { data: queue } = useSuspenseQuery({
    queryKey: ['doctor-queue'],
    queryFn: () => doctorApi.getQueue().then((r) => r.data.data),
    staleTime: 30 * 1000,
  });

  const { data: patients } = useSuspenseQuery({
    queryKey: ['doctor-patients'],
    queryFn: () => doctorApi.getPatients().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const waitingCount   = queue?.filter((q: QueueToken) => q.status === 'WAITING').length ?? 0;
  const completedCount = queue?.filter((q: QueueToken) => q.status === 'COMPLETED').length ?? 0;
  const nextWaiting    = queue?.find((q: QueueToken) => q.status === 'WAITING');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-ease-14 mb-ease-section animate-fade-in animate-delay-75">
      <StatTile label="Total Patients"   value={patients?.length ?? 0} />
      <StatTile label="In queue"         value={waitingCount} sub={waitingCount > 0 ? `next: #${nextWaiting?.tokenNumber ?? '—'}` : 'clear'} />
      <StatTile label="Completed"        value={completedCount} />
    </div>
  );
};

const MainDashboardSection: React.FC<{ calledTokenId: string | null; setCalledTokenId: (id: string | null) => void }> = ({ calledTokenId, setCalledTokenId }) => {
  const queryClient = useQueryClient();
  
  const { data: queue } = useSuspenseQuery({
    queryKey: ['doctor-queue'],
    queryFn: () => doctorApi.getQueue().then((r) => r.data.data),
    staleTime: 30 * 1000,
  });

  const advanceMutation = useMutation({
    mutationFn: (action: 'CALL_NEXT' | 'COMPLETE_CURRENT' | 'SKIP_CURRENT') => doctorApi.advanceQueue(action),
    onSuccess: (res) => {
      const newToken = res.data.data;
      setCalledTokenId(newToken.id);
      setTimeout(() => setCalledTokenId(null), 3500);
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    },
  });

  const waitingCount   = queue?.filter((q: QueueToken) => q.status === 'WAITING').length ?? 0;
  const currentToken   = queue?.find((q: QueueToken) => q.status === 'IN_PROGRESS' || q.status === ('CALLED' as any));
  const nextWaiting    = queue?.find((q: QueueToken) => q.status === 'WAITING');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-ease-28 animate-fade-in animate-delay-150">
      {/* NOW SEEING — col-span-2 */}
      <div className="lg:col-span-2 card p-0 flex flex-col overflow-hidden">
        <div className="px-ease-21 py-ease-14 flex items-center justify-between border-b border-hairline-gray bg-linen-white">
          <p className="text-ease-caption text-charcoal">Now seeing</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-ease-28 py-ease-56 text-center bg-linen-white">
          {currentToken ? (
            <>
              <div className="font-mono text-ease-display text-forest-ink tracking-tight mb-ease-14">
                #{String(currentToken.tokenNumber).padStart(2, '0')}
              </div>
              <p className="text-ease-subheading font-display text-forest-ink mb-ease-7">
                {currentToken.patient?.firstName} {currentToken.patient?.lastName}
              </p>
              {currentToken.appointment?.reason && (
                <p className="text-ease-body-sm px-ease-14 py-ease-7 rounded-badges bg-mist-blue/30 text-forest-ink mb-ease-21">
                  {currentToken.appointment.reason}
                </p>
              )}
              <span className="badge-pill">In room</span>
            </>
          ) : (
            <div className="flex flex-col items-center opacity-50">
              <p className="text-ease-body-sm text-charcoal">No active patient</p>
            </div>
          )}
        </div>

        <div className="px-ease-21 py-ease-21 border-t border-hairline-gray bg-linen-white flex gap-2">
          {currentToken ? (
            <>
              <button
                onClick={() => advanceMutation.mutate('COMPLETE_CURRENT')}
                disabled={advanceMutation.isPending}
                className="flex-1 btn-primary disabled:opacity-40"
              >
                {advanceMutation.isPending ? '...' : 'Complete Patient'}
              </button>
              <button
                onClick={() => advanceMutation.mutate('SKIP_CURRENT')}
                disabled={advanceMutation.isPending}
                className="px-4 py-2 text-sm rounded-nav border border-hairline-gray text-danger-700 hover:bg-danger-50 transition-colors disabled:opacity-40"
              >
                Skip
              </button>
            </>
          ) : (
            <button
              onClick={() => advanceMutation.mutate('CALL_NEXT')}
              disabled={advanceMutation.isPending || waitingCount === 0}
              className="w-full btn-primary disabled:opacity-40"
            >
              {advanceMutation.isPending ? (
                 <span className="animate-spin text-linen-white text-ease-body">...</span>
              ) : (
                 <>Call next patient {waitingCount > 0 && <span className="ml-ease-7 font-mono px-ease-7 rounded bg-linen-white/20">#{nextWaiting?.tokenNumber}</span>}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* QUEUE LIST — col-span-3 */}
      <div className="lg:col-span-3 card p-0 flex flex-col overflow-hidden">
        <div className="px-ease-21 py-ease-14 flex items-center justify-between border-b border-hairline-gray bg-linen-white">
          <p className="text-ease-caption text-charcoal">Today's queue</p>
          <span className="badge-pill bg-linen text-charcoal">{queue?.length ?? 0} total</span>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar bg-linen-white" style={{ maxHeight: '420px' }}>
          {queue && queue.length > 0 ? (
            queue.map((token: QueueToken) => (
              <MiniQueueRow
                key={token.id}
                token={token}
                isActive={token.status === 'IN_PROGRESS' || token.status === ('CALLED' as any)}
                isFlashing={token.id === calledTokenId}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-ease-56 text-charcoal">
              <p className="text-ease-body-sm">Queue is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Doctor Dashboard ─────────────────────────────────────────────────────────
const DoctorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [calledTokenId, setCalledTokenId] = useState<string | null>(null);
  const { on, off } = useSocket({ namespace: '/' });

  useEffect(() => {
    const handleQueueUpdate = (data: unknown) => {
      const update = data as { calledTokenId?: string };
      if (update?.calledTokenId) {
        setCalledTokenId(update.calledTokenId);
        setTimeout(() => setCalledTokenId(null), 3500);
      }
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    };
    on('queue:update', handleQueueUpdate);
    return () => {
      off('queue:update', handleQueueUpdate);
    };
  }, [on, off, queryClient]);

  return (
    <AppShell>
      <div className="min-h-full overflow-y-auto bg-linen-white">
        <div className="page-container py-ease-section max-w-6xl mx-auto">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-ease-section animate-fade-in">
            <div className="flex flex-col items-start">
              <span className="badge-pill mb-ease-14">Overview</span>
              <h1 className="text-ease-display font-display tracking-tight text-forest-ink">
                Good {getGreeting()}, Dr. {user?.lastName}
              </h1>
              <p className="text-charcoal font-normal text-ease-body mt-ease-14">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* ── Stats row ───────────────────────────────────────────────── */}
          <Suspense fallback={
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-ease-14 mb-ease-section">
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 rounded-cards" />)}
            </div>
          }>
            <StatsRow />
          </Suspense>

          {/* ── Main grid ───────────────────────────────────────────────── */}
          <Suspense fallback={
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-ease-28">
              <div className="lg:col-span-2 skeleton h-[500px] rounded-cards" />
              <div className="lg:col-span-3 skeleton h-[500px] rounded-cards" />
            </div>
          }>
            <MainDashboardSection calledTokenId={calledTokenId} setCalledTokenId={setCalledTokenId} />
          </Suspense>

        </div>
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

export default DoctorDashboardPage;
