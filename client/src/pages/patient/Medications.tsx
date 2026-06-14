import React, { useState, Suspense } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppShell } from '../../layouts/AppShell';
import { patientApi } from '../../services/portal.api';
import { useConfirm } from '../../components/ConfirmProvider';
import { medicineSchema, type MedicineInput } from '../../validators';
import type { MedicationLog } from '../../types/api';

const AddMedicationForm: React.FC<{ initialData?: any; onSuccess: () => void; onCancel: () => void }> = ({ initialData, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MedicineInput>({
    resolver: zodResolver(medicineSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      dosage: initialData.dosage,
      unit: initialData.unit as any,
      frequency: initialData.frequency as any,
      timings: initialData.timings,
      startDate: format(new Date(initialData.startDate), 'yyyy-MM-dd'),
      instructions: initialData.instructions || '',
    } : {
      name: '',
      dosage: '',
      unit: 'mg',
      frequency: 'DAILY',
      timings: ['09:00'],
      startDate: format(new Date(), 'yyyy-MM-dd'),
      instructions: '',
    }
  });

  const [timings, setTimings] = useState<string[]>(initialData?.timings || ['08:00']);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => initialData ? patientApi.updateMedicine(initialData.id, payload) : patientApi.createMedicine(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-medicines'] });
      queryClient.invalidateQueries({ queryKey: ['meds', 'today'] });
      onSuccess();
    },
    onError: (err: any) => {
      setApiError(err.response?.data?.error?.message || 'Failed to save medication.');
    }
  });

  const onSubmit = (data: MedicineInput) => {
    setApiError('');
    if (timings.some(t => !/^\d{2}:\d{2}$/.test(t))) {
      setApiError('Invalid time format');
      return;
    }
    data.timings = timings;
    saveMutation.mutate(data);
  };

  return (
    <div className="card mb-ease-28 animate-slide-up border border-forest-ink">
      <div className="flex items-center justify-between mb-ease-21 border-b border-hairline-gray pb-ease-14">
        <h3 className="text-ease-subheading font-display text-forest-ink tracking-tight">{initialData ? 'Edit Medication' : 'Add New Medication'}</h3>
        <button onClick={onCancel} className="text-charcoal hover:bg-mint-veil p-2 rounded-nav transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-ease-21">
        {apiError && <div className="p-ease-14 bg-danger-50 text-danger-700 rounded-cards text-ease-body-sm font-normal border border-danger-100">{apiError}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-ease-21">
          <div className="space-y-1.5">
            <label className="label">Medicine Name</label>
            <input type="text" {...register('name')} className="input" placeholder="Lisinopril" />
            {errors.name && <p className="error-text">{errors.name.message}</p>}
          </div>
          <div className="flex gap-ease-14">
            <div className="flex-1 space-y-1.5">
              <label className="label">Dosage</label>
              <input type="text" {...register('dosage')} className="input" placeholder="10" />
              {errors.dosage && <p className="error-text">{errors.dosage.message}</p>}
            </div>
            <div className="w-28 space-y-1.5">
              <label className="label">Unit</label>
              <select {...register('unit')} className="input">
                <option value="mg">mg</option>
                <option value="ml">ml</option>
                <option value="mcg">mcg</option>
                <option value="tablet">tablet</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-ease-21">
          <div className="space-y-1.5">
            <label className="label">Frequency</label>
            <select {...register('frequency', {
              onChange: (e) => {
                const freq = e.target.value;
                let newTimings: string[] = [];
                if (freq === 'DAILY') newTimings = ['08:00'];
                else if (freq === 'TWICE_DAILY') newTimings = ['08:00', '20:00'];
                else if (freq === 'THRICE_DAILY') newTimings = ['08:00', '14:00', '20:00'];
                else if (freq === 'WEEKLY') newTimings = ['08:00'];
                setTimings(newTimings);
              }
            })} className="input">
              <option value="DAILY">Daily</option>
              <option value="TWICE_DAILY">Twice Daily</option>
              <option value="THRICE_DAILY">Thrice Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="AS_NEEDED">As Needed (PRN)</option>
            </select>
          </div>
          
          <div className="space-y-1.5 md:col-span-2">
            <label className="label">Times (HH:MM)</label>
            {timings.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {timings.map((t, idx) => (
                  <div key={idx} className="flex-1 min-w-[100px]">
                    <label className="text-ease-caption text-charcoal block mb-1">Time {idx + 1}</label>
                    <input 
                      type="time" 
                      className="input w-full" 
                      value={t} 
                      onChange={e => {
                        const newT = [...timings];
                        newT[idx] = e.target.value;
                        setTimings(newT);
                      }} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-ease-21">
          <div className="space-y-1.5">
            <label className="label">Start Date</label>
            <input type="date" {...register('startDate')} className="input font-mono" />
            {errors.startDate && <p className="error-text">{errors.startDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="label">Instructions (optional)</label>
            <input type="text" {...register('instructions')} className="input" placeholder="Take with food" />
          </div>
        </div>

        <div className="flex justify-end pt-ease-14">
          <button type="submit" disabled={isSubmitting || saveMutation.isPending} className="btn-primary">
            {isSubmitting || saveMutation.isPending ? 'Saving...' : 'Save Medication'}
          </button>
        </div>
      </form>
    </div>
  );
};

const TodaySchedule: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const { data: todayLogs } = useSuspenseQuery({
    queryKey: ['meds', 'today'],
    queryFn: () => patientApi.getTodayMeds().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string, action: 'take' | 'skip' | 'snooze' }) => {
      if (action === 'take') return patientApi.markTaken(id);
      if (action === 'skip') return patientApi.markSkipped(id, 'User skipped');
      return patientApi.snoozeLog(id, 60);
    },
    onSuccess: () => {
      setEditingLogId(null);
      queryClient.invalidateQueries({ queryKey: ['meds', 'today'] });
    }
  });

  if (!todayLogs || todayLogs.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-ease-56 text-charcoal bg-linen-white">
         <h3 className="font-normal text-ease-body-sm mb-1">No medications scheduled for today.</h3>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-ease-14">
      {todayLogs.map((log: MedicationLog) => {
        const isPending = log.status === 'PENDING' || log.status === 'SNOOZED';
        const isTaken = log.status === 'TAKEN';
        const isSkipped = log.status === 'SKIPPED';
        const showActions = isPending || editingLogId === log.id;
        
        return (
          <div key={log.id} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-ease-21 transition-all duration-300
            ${isTaken && !showActions ? 'bg-mint-veil/50 border-mint-veil' : isSkipped && !showActions ? 'bg-danger-50 border-danger-100' : 'bg-linen-white border-hairline-gray'}`}>
            <div className="flex items-center gap-ease-14">
              <div className={`w-12 h-12 rounded-cards flex items-center justify-center flex-shrink-0
                ${isTaken ? 'bg-forest-ink text-linen-white' : isSkipped ? 'bg-danger-100 text-danger-700' : 'bg-mist-blue text-forest-ink'}`}>
                {isTaken ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                 : isSkipped ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                 : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
              </div>
              <div>
                <div className="flex items-baseline gap-ease-7 mb-1">
                  <span className={`font-bold text-ease-body tracking-tight ${isTaken ? 'line-through text-charcoal' : 'text-forest-ink'}`}>{log.medicine?.name}</span>
                  <span className="text-ease-caption text-charcoal">{log.medicine?.dosage} {log.medicine?.unit}</span>
                </div>
                <div className="flex items-center gap-ease-7">
                  <span className="font-mono text-ease-body-sm text-charcoal">{format(parseISO(log.scheduledAt), 'h:mm a')}</span>
                  <span className={`badge-pill ${
                    isTaken ? 'bg-mint-veil text-forest-ink' : 
                    isSkipped ? 'bg-danger-100 text-danger-700' : 
                    log.status === 'SNOOZED' ? 'bg-mist-blue text-forest-ink' :
                    'bg-hairline-gray text-charcoal'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            </div>
            
            {showActions ? (
              <div className="flex flex-wrap gap-ease-7 w-full sm:w-auto mt-4 sm:mt-0">
                <button disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: log.id, action: 'snooze' })} className="px-ease-14 py-ease-7 rounded-nav border border-hairline-gray text-charcoal hover:bg-linen transition-colors text-ease-caption bg-white">
                  Snooze 1h
                </button>
                <button disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: log.id, action: 'skip' })} className="px-ease-14 py-ease-7 rounded-nav border border-hairline-gray text-danger-700 hover:bg-danger-50 transition-colors text-ease-caption bg-white">
                  Skip
                </button>
                <button disabled={actionMutation.isPending} onClick={() => actionMutation.mutate({ id: log.id, action: 'take' })} className="btn-primary py-ease-7 px-ease-14 text-ease-caption">
                  Take Now
                </button>
                {!isPending && (
                  <button onClick={() => setEditingLogId(null)} className="px-ease-14 py-ease-7 text-charcoal hover:text-forest-ink transition-colors text-ease-caption underline underline-offset-4 ml-2">
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-ease-7 w-full sm:w-auto mt-4 sm:mt-0">
                <button 
                  onClick={() => setEditingLogId(log.id)} 
                  className="px-ease-14 py-ease-7 rounded-nav border border-hairline-gray text-charcoal hover:bg-linen transition-colors text-ease-caption bg-white shadow-subtle"
                >
                  Manage
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ActiveMedications: React.FC<{ isManageMode: boolean; onEdit: (med: any) => void }> = ({ isManageMode, onEdit }) => {
  const queryClient = useQueryClient();
  const { data: meds } = useSuspenseQuery({
    queryKey: ['my-medicines'],
    queryFn: () => patientApi.getMedicines().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientApi.deleteMedicine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-medicines'] });
      queryClient.invalidateQueries({ queryKey: ['meds', 'today'] });
    }
  });

  const { confirm } = useConfirm();

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete medication?',
      message: 'This medication and all future reminders will be permanently removed.',
      confirmText: 'Delete medication',
      cancelText: 'Keep medication',
      isDestructive: true,
    });
    if (isConfirmed) {
      deleteMutation.mutate(id);
    }
  };

  if (!meds || meds.length === 0) {
    return (
       <div className="card flex flex-col items-center justify-center p-ease-56 text-charcoal bg-linen-white">
          <h3 className="font-normal text-ease-body-sm mb-1">You haven't added any medications yet.</h3>
       </div>
    );
  }

  return (
    <div className="flex flex-col gap-ease-14">
      {meds.map((med: any) => (
        <div key={med.id} className="card relative group">
          {isManageMode && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <button onClick={() => onEdit(med)} className="p-1.5 text-charcoal hover:bg-mist-blue rounded-nav transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button disabled={deleteMutation.isPending} onClick={() => handleDelete(med.id)} className="p-1.5 text-danger-700 hover:bg-danger-50 rounded-nav transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex justify-between items-start mb-ease-7">
            <span className="font-bold text-forest-ink text-ease-body tracking-tight">{med.name}</span>
            {!isManageMode && <span className="badge-pill bg-mist-blue text-forest-ink">{med.frequency.replace('_', ' ')}</span>}
          </div>
          <p className="text-ease-caption text-charcoal mb-ease-14">
            {med.dosage} {med.unit}
          </p>
          <div className="flex flex-wrap gap-ease-7 mb-ease-14">
            {med.timings.map((t: string) => (
              <span key={t} className="font-mono text-ease-body-sm px-ease-7 py-ease-4 rounded-badges bg-linen text-charcoal">
                {t}
              </span>
            ))}
          </div>
          {med.instructions && (
            <p className="text-ease-body-sm text-charcoal bg-mist-blue/20 p-ease-14 rounded-nav">
              {med.instructions}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export const MedicationsPage: React.FC = () => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);

  const handleEdit = (med: any) => {
    setEditingMed(med);
    setShowAddForm(true);
    setIsManageMode(false); // Close manage mode while editing
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingMed(null);
  };

  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-ease-21 mb-ease-section animate-fade-in">
          <div className="flex flex-col items-start">
            <span className="badge-pill mb-ease-14">Regimen</span>
            <h1 className="text-ease-display font-display tracking-tight text-forest-ink">Medications</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => {
                setIsManageMode(!isManageMode);
                if (showAddForm) handleCloseForm();
              }} 
              className="px-4 py-2 border border-hairline-gray rounded-nav text-charcoal hover:bg-mist-blue/30 transition-colors"
            >
              {isManageMode ? 'Done' : 'Manage Medications'}
            </button>
            <button 
              onClick={() => {
                setShowAddForm(!showAddForm);
                if (!showAddForm) {
                  setEditingMed(null);
                  setIsManageMode(false);
                }
              }} 
              className="btn-primary"
            >
              {showAddForm && !editingMed ? 'Cancel' : 'Add Medication'}
            </button>
          </div>
        </div>

        {showAddForm && (
          <AddMedicationForm initialData={editingMed} onSuccess={handleCloseForm} onCancel={handleCloseForm} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-ease-section">
          {/* Today's Schedule */}
          <div>
            <div className="flex items-center gap-ease-7 mb-ease-21">
              <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink">Today's Schedule</h3>
            </div>
            <Suspense fallback={
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="skeleton h-[120px] rounded-cards" />)}
              </div>
            }>
              <TodaySchedule />
            </Suspense>
          </div>

          {/* My Active Medications */}
          <div>
            <div className="flex items-center gap-ease-7 mb-ease-21">
              <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink">My Medications</h3>
            </div>
            <Suspense fallback={
              <div className="space-y-4">
                {[1,2,3].map(i => <div key={i} className="skeleton h-[180px] rounded-cards" />)}
              </div>
            }>
              <ActiveMedications isManageMode={isManageMode} onEdit={handleEdit} />
            </Suspense>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default MedicationsPage;
