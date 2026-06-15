import React, { useEffect, useRef } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../layouts/AppShell';
import { doctorApi } from '../../services/portal.api';
import { useSocket } from '../../hooks/useSocket';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  WAITING:     { label: 'Waiting',     cls: 'badge-pill bg-linen text-charcoal' },
  CALLED:      { label: 'Called',      cls: 'badge-pill bg-mist-blue text-forest-ink' },
  IN_PROGRESS: { label: 'In Room',     cls: 'badge-pill bg-mist-blue text-forest-ink' },
  COMPLETED:   { label: 'Done',        cls: 'badge-pill bg-mint-veil text-forest-ink' },
  SKIPPED:     { label: 'Skipped',     cls: 'badge-pill bg-hairline-gray text-charcoal' },
};

const QueueRow: React.FC<{
  token: any;
  isActive: boolean;
  isNew: boolean;
  position: number;
}> = ({ token, isActive, isNew, position }) => {
  const s = STATUS_MAP[token.status] ?? { label: token.status, cls: 'badge-pill bg-linen text-charcoal' };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-all duration-300 border-b border-hairline-gray
      ${isNew    ? 'bg-mint-veil/50' :
        isActive ? 'bg-mist-blue/20' :
                   'hover:bg-linen'}
    `}>
      <div className="w-12 flex-shrink-0 text-right">
        <span className={`font-mono text-ease-heading-sm font-normal tabular tracking-tight ${isActive ? 'text-forest-ink' : 'text-charcoal'}`}>
          {String(token.tokenNumber).padStart(2, '0')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ease-body-sm font-semibold truncate text-forest-ink">
          {token.patient.firstName} {token.patient.lastName}
        </p>
        {token.appointment?.reason && (
          <p className="text-ease-caption truncate mt-0.5 text-charcoal">
            {token.appointment.reason}
          </p>
        )}
      </div>
      {token.estimatedWaitMinutes != null && token.status === 'WAITING' && (
        <span className="font-mono text-ease-caption tabular hidden sm:block flex-shrink-0 text-charcoal">
          ~{token.estimatedWaitMinutes}m
        </span>
      )}
      <span className={`${s.cls} flex-shrink-0`}>{s.label}</span>
      {token.status === 'WAITING' && (
        <span className="font-mono text-ease-caption tabular w-4 text-center flex-shrink-0 text-charcoal">
          {position}
        </span>
      )}
    </div>
  );
};

export interface PrescriptionMedicineInput {
  name: string;
  dosage: string;
  unit: string;
  frequency: 'DAILY' | 'BID' | 'TID' | 'QID' | 'WEEKLY' | 'MONTHLY' | 'AS_NEEDED';
  timings: string[];
  durationDays?: number;
  instructions?: string;
}

export const DoctorQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const { on, off } = useSocket({ namespace: '/queue' });
  const [clinicalNotes, setClinicalNotes] = React.useState('');
  const [medicines, setMedicines] = React.useState<PrescriptionMedicineInput[]>([]);
  const [newMed, setNewMed] = React.useState<Partial<PrescriptionMedicineInput>>({ frequency: 'DAILY', timings: ['08:00'], unit: 'mg' });
  const [newTokenId, setNewTokenId] = React.useState<string | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const { data: queue } = useSuspenseQuery({
    queryKey: ['doctor-queue'],
    queryFn: () => doctorApi.getQueue().then((r) => r.data.data),
    staleTime: 30 * 1000,
  });

  const nextMutation = useMutation({
    mutationFn: async (action: 'CALL_NEXT' | 'COMPLETE_CURRENT' | 'SKIP_CURRENT' | 'COMPLETE_AND_CALL_NEXT') => {
      if (action === 'COMPLETE_AND_CALL_NEXT') {
        await doctorApi.advanceQueue('COMPLETE_CURRENT');
        try {
          return await doctorApi.advanceQueue('CALL_NEXT');
        } catch (e) {
          // It is fine if there is no next patient in the queue
          return { data: { data: null } } as any;
        }
      }
      return doctorApi.advanceQueue(action);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'doctor'] });
      setClinicalNotes('');
      setMedicines([]);
    },
  });

  const [saveSuccess, setSaveSuccess] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const [generatedRxUrl, setGeneratedRxUrl] = React.useState<string | null>(null);

  const notesMutation = useMutation({
    mutationFn: (payload: { appointmentId: string; clinicalNotes: string; medicines: PrescriptionMedicineInput[] }) =>
      doctorApi.updateAppointmentNotes(payload.appointmentId, {
        clinicalNotes: payload.clinicalNotes,
        medicines: payload.medicines,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
      setSaveSuccess('Prescription and notes saved successfully!');
      if (response.data?.data?.fileUrl) {
        setGeneratedRxUrl(response.data.data.fileUrl);
      }
      setTimeout(() => setSaveSuccess(''), 3000);
    },
    onError: (error: any) => {
      setSaveError(error.response?.data?.error?.message || 'Failed to save notes. Ensure times are in HH:MM format.');
      setTimeout(() => setSaveError(''), 5000);
    }
  });

  useEffect(() => {
    const handleUpdate = (data: any) => {
      if (data?.newTokenId) {
        setNewTokenId(data.newTokenId);
        setTimeout(() => setNewTokenId(null), 4000);
      }
      queryClient.invalidateQueries({ queryKey: ['doctor-queue'] });
    };
    on('queue:update', handleUpdate);
    return () => off('queue:update', handleUpdate);
  }, [on, off, queryClient]);

  const activeToken = queue?.find((t: any) => t.status === 'IN_PROGRESS' || t.status === 'CALLED');
  useEffect(() => {
    if (activeToken?.appointment) {
      setClinicalNotes(activeToken.appointment.clinicalNotes || '');
      setMedicines([]);
      setGeneratedRxUrl(null);
    }
  }, [activeToken?.appointmentId]);

  const waitingPatients = queue?.filter((t: any) => t.status === 'WAITING') || [];
  const completedToday  = queue?.filter((t: any) => t.status === 'COMPLETED').length ?? 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.ctrlKey && !nextMutation.isPending && waitingPatients.length > 0) {
        e.preventDefault();
        nextMutation.mutate(activeToken ? 'COMPLETE_AND_CALL_NEXT' : 'CALL_NEXT');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextMutation, waitingPatients.length]);

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-44px)] animate-fade-in bg-linen-white">
        
        {/* LEFT PANEL: Queue list */}
        <div className="flex flex-col w-full lg:w-72 xl:w-80 flex-shrink-0 bg-linen-white border-r border-hairline-gray relative z-10">
          <div className="px-4 py-4 flex flex-col items-start border-b border-hairline-gray">
            <p className="text-ease-caption text-charcoal">
              <span className="font-mono">{waitingPatients.length}</span> waiting · 
              <span className="font-mono ml-1">{completedToday}</span> done
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {queue && queue.length > 0 ? (
              queue.map((token: any) => (
                <QueueRow
                  key={token.id}
                  token={token}
                  isActive={token.status === 'IN_PROGRESS' || token.status === 'CALLED'}
                  isNew={token.id === newTokenId}
                  position={waitingPatients.indexOf(token) + 1}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 gap-3 opacity-50">
                <p className="text-ease-caption text-charcoal">Queue is clear</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-linen-white border-t border-hairline-gray">
            <button
              id="advance-queue-btn"
              onClick={() => nextMutation.mutate('CALL_NEXT')}
              disabled={nextMutation.isPending || waitingPatients.length === 0 || !!activeToken}
              className="w-full btn-primary disabled:opacity-40 flex justify-between items-center text-sm py-2 px-3"
            >
              <span>
                {nextMutation.isPending ? 'Calling...' : 'Call next patient'}
              </span>
              <span className="font-mono text-[10px] opacity-60 bg-white/20 px-1.5 py-0.5 rounded">⌃ Space</span>
            </button>
          </div>
        </div>
        
        {/* RIGHT PANEL: Active patient */}
        <div className="hidden lg:flex flex-col flex-1 overflow-hidden bg-linen-white relative">
          {activeToken ? (
            <>
              <div className="px-6 pt-5 pb-3 flex-shrink-0 relative z-10 border-b border-hairline-gray">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-baseline gap-4">
                      <div className="font-mono font-normal tracking-tight" style={{ fontSize: '3rem', color: '#0f3e17', lineHeight: 1 }}>
                        #{String(activeToken.tokenNumber).padStart(2, '0')}
                      </div>
                      <h1 className="text-3xl font-display tracking-tight text-forest-ink">
                        {activeToken.patient?.firstName} {activeToken.patient?.lastName}
                      </h1>
                    </div>
                    {activeToken.appointment?.reason && (
                      <p className="text-sm text-charcoal mt-2 bg-mist-blue/20 inline-block px-3 py-1.5 rounded-badges">
                        {activeToken.appointment.reason}
                      </p>
                    )}
                  </div>
                  <span className="badge-pill bg-mint-veil text-forest-ink">
                    {STATUS_MAP[activeToken.status]?.label ?? activeToken.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-3">
                  {activeToken.calledAt && (
                    <span className="text-xs text-charcoal font-mono bg-linen px-2 py-1 rounded-badges">
                      Called {new Date(activeToken.calledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {activeToken.appointment?.type === 'TELECONSULT' && activeToken.appointment?.meetingUrl && (
                    <a href={activeToken.appointment.meetingUrl} target="_blank" rel="noreferrer" className="text-xs bg-mint-veil text-forest-ink px-3 py-1 rounded-badges hover:bg-sage-wash transition-colors">
                      Join Video Call
                    </a>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10 custom-scrollbar">
                <div className="max-w-3xl space-y-ease-14">
                  <div className="card p-4 border border-hairline-gray">
                    <label className="label uppercase tracking-tight text-ease-caption font-bold mb-2 block">
                      Clinical Notes
                    </label>
                    <textarea
                      ref={notesRef}
                      value={clinicalNotes}
                      onChange={(e) => setClinicalNotes(e.target.value)}
                      className="input w-full min-h-[80px]"
                      placeholder="Chief complaint, examination findings, diagnosis…"
                    />
                  </div>
                  
                  <div className="card p-4 border border-hairline-gray">
                    <label className="label uppercase tracking-tight text-ease-caption font-bold mb-2 block">
                      E-Prescription
                    </label>
                    {medicines.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {medicines.map((m, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-linen rounded-cards border border-hairline-gray">
                            <div>
                              <p className="text-sm font-semibold text-forest-ink">{m.name} {m.dosage}{m.unit}</p>
                              <p className="text-[11px] text-charcoal">{m.frequency} × {m.durationDays} days | {m.instructions}</p>
                            </div>
                            <button onClick={() => setMedicines(prev => prev.filter((_, i) => i !== idx))} className="text-danger-700 hover:text-danger-900 text-xs font-semibold">Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-mist-blue/10 p-3 rounded-cards border border-hairline-gray">
                      <div className="col-span-2">
                        <label className="text-ease-caption text-charcoal block mb-1">Medicine Name</label>
                        <input type="text" className="input w-full text-sm py-1.5" placeholder="e.g. Paracetamol" value={newMed.name || ''} onChange={e => setNewMed({...newMed, name: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-ease-caption text-charcoal block mb-1">Dosage</label>
                        <input type="text" className="input w-full text-sm py-1.5" placeholder="e.g. 500" value={newMed.dosage || ''} onChange={e => setNewMed({...newMed, dosage: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-ease-caption text-charcoal block mb-1">Unit</label>
                        <select className="input w-full text-sm py-1.5" value={newMed.unit || 'mg'} onChange={e => setNewMed({...newMed, unit: e.target.value})}>
                          <option value="mg">mg</option>
                          <option value="ml">ml</option>
                          <option value="mcg">mcg</option>
                          <option value="tablet">tablet</option>
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <label className="text-ease-caption text-charcoal block mb-1">Frequency</label>
                        <select className="input w-full text-sm py-1.5" value={newMed.frequency || 'DAILY'} onChange={e => {
                          const freq = e.target.value as any;
                          let timings: string[] = [];
                          if (freq === 'DAILY') timings = ['08:00'];
                          else if (freq === 'TWICE_DAILY') timings = ['08:00', '20:00'];
                          else if (freq === 'THRICE_DAILY') timings = ['08:00', '14:00', '20:00'];
                          else if (freq === 'WEEKLY') timings = ['08:00'];
                          setNewMed({...newMed, frequency: freq, timings});
                        }}>
                          <option value="DAILY">Daily</option>
                          <option value="TWICE_DAILY">Twice a Day (BID)</option>
                          <option value="THRICE_DAILY">Thrice a Day (TID)</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="AS_NEEDED">As Needed (PRN)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-ease-caption text-charcoal block mb-1">Duration (Days)</label>
                        <input type="number" className="input w-full text-sm py-1.5" placeholder="e.g. 5" value={newMed.durationDays || ''} onChange={e => setNewMed({...newMed, durationDays: Number(e.target.value)})} />
                      </div>
                      
                      {newMed.timings && newMed.timings.length > 0 && (
                        <div className="col-span-4 flex flex-wrap gap-3">
                          {newMed.timings.map((t, idx) => (
                            <div key={idx} className="flex-1 min-w-[100px]">
                              <label className="text-ease-caption text-charcoal block mb-1">Time {idx + 1}</label>
                              <input 
                                type="time" 
                                className="input w-full text-sm py-1.5" 
                                value={t} 
                                onChange={e => {
                                  const newTimings = [...(newMed.timings || [])];
                                  newTimings[idx] = e.target.value;
                                  setNewMed({ ...newMed, timings: newTimings });
                                }} 
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="col-span-4">
                        <label className="text-ease-caption text-charcoal block mb-1">Instructions (Optional)</label>
                        <input type="text" className="input w-full text-sm py-1.5" placeholder="Take after food" value={newMed.instructions || ''} onChange={e => setNewMed({...newMed, instructions: e.target.value})} />
                      </div>
                      
                      <div className="col-span-4 pt-2">
                        <button 
                          onClick={() => {
                            if (newMed.name && newMed.dosage && newMed.unit && newMed.durationDays) {
                              setMedicines(prev => [...prev, newMed as PrescriptionMedicineInput]);
                              setNewMed({ frequency: 'DAILY', timings: ['08:00'], unit: 'mg' });
                            }
                          }}
                          disabled={!newMed.name || !newMed.dosage || !newMed.unit || !newMed.durationDays}
                          className="w-full py-2 border border-forest-ink text-forest-ink font-semibold rounded-buttons text-sm hover:bg-forest-ink hover:text-linen-white transition-colors disabled:opacity-50"
                        >
                          Add Medicine
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {saveSuccess && <div className="p-3 bg-mint-veil/50 text-forest-ink border border-mint-veil rounded-cards text-sm">{saveSuccess}</div>}
                  {saveError && <div className="p-3 bg-danger-50 text-danger-700 border border-danger-100 rounded-cards text-sm">{saveError}</div>}
                  
                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      onClick={() => notesMutation.mutate({ appointmentId: activeToken.appointmentId, clinicalNotes, medicines })}
                      disabled={notesMutation.isPending}
                      className="flex-1 px-4 py-3 rounded-buttons border border-forest-ink text-forest-ink hover:bg-mist-blue/20 transition-colors font-semibold text-sm disabled:opacity-50"
                    >
                      {notesMutation.isPending ? 'Saving...' : 'Save Notes & Rx'}
                    </button>
                    {generatedRxUrl && (
                      <a 
                        href={generatedRxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-3 flex items-center justify-center rounded-buttons bg-forest-ink text-linen-white hover:bg-forest-ink/90 transition-colors font-semibold text-sm"
                      >
                        Download Rx PDF
                      </a>
                    )}
                    <button
                      onClick={() => nextMutation.mutate('COMPLETE_AND_CALL_NEXT')}
                      disabled={nextMutation.isPending}
                      className="flex-1 px-4 py-3 rounded-buttons bg-forest-ink text-linen-white font-semibold text-sm disabled:opacity-50"
                    >
                      {nextMutation.isPending ? 'Processing...' : 'Complete & Call Next'}
                    </button>
                  </div>
                  <div className="flex justify-end border-t border-hairline-gray pt-3">
                    <button
                      onClick={() => nextMutation.mutate('SKIP_CURRENT')}
                      disabled={nextMutation.isPending}
                      className="text-xs text-danger-700 hover:text-danger-900 border border-hairline-gray px-3 py-1.5 rounded-nav transition-colors"
                    >
                      Skip Patient (No Show)
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-5">
              <div className="text-center">
                <p className="text-ease-caption text-charcoal">No active patient</p>
                <p className="text-ease-body-sm font-normal text-forest-ink mt-2">
                  {waitingPatients.length > 0 ? `${waitingPatients.length} waiting in queue` : 'Queue is empty for today'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default DoctorQueue;
