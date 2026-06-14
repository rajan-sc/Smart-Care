import React, { useState, Suspense } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../layouts/AppShell';
import { useAuth } from '../../context/AuthContext';
import { doctorApi } from '../../services/portal.api';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const ScheduleEditor: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: profile } = useSuspenseQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: () => doctorApi.getDoctorProfile(user!.id).then((r: any) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const [schedule, setSchedule] = useState<Record<string, { startTime: string; endTime: string }[]>>(() => {
    const base = DAYS.reduce((acc, day) => ({ ...acc, [day]: [] }), {} as any);
    if (profile?.profile?.availability) {
      profile.profile.availability.forEach((slot: any) => {
        if (base[slot.dayOfWeek]) {
          base[slot.dayOfWeek].push({ startTime: slot.startTime, endTime: slot.endTime });
        }
      });
    }
    return base;
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateMutation = useMutation({
    mutationFn: () => {
      const availabilityArray: any[] = [];
      for (const [day, slots] of Object.entries(schedule)) {
        for (const slot of slots) {
          if (slot.startTime && slot.endTime) {
            availabilityArray.push({
              dayOfWeek: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              maxPatients: 20
            });
          }
        }
      }
      return doctorApi.updateAvailability({ availability: availabilityArray });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-profile'] });
      setSuccess('Availability schedule updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to update schedule.');
    }
  });

  const handleAddSlot = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { startTime: '09:00', endTime: '17:00' }]
    }));
  };

  const handleRemoveSlot = (day: string, index: number) => {
    setSchedule(prev => {
      const newDaySlots = [...(prev[day] || [])];
      newDaySlots.splice(index, 1);
      return { ...prev, [day]: newDaySlots };
    });
  };

  const handleSlotChange = (day: string, index: number, field: 'startTime'|'endTime', value: string) => {
    setSchedule(prev => {
      const newDaySlots = [...(prev[day] || [])];
      newDaySlots[index] = { ...newDaySlots[index], [field]: value };
      return { ...prev, [day]: newDaySlots };
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-ease-21 mb-ease-section animate-fade-in">
        <div className="flex flex-col items-start">
          <span className="badge-pill mb-ease-14">Availability</span>
          <h1 className="text-ease-display font-display tracking-tight text-forest-ink">My Schedule</h1>
        </div>
        <button 
          onClick={() => updateMutation.mutate()} 
          disabled={updateMutation.isPending}
          className="btn-primary"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Schedule'}
        </button>
      </div>

      {error && <div className="p-ease-14 mb-ease-21 bg-danger-50 text-danger-700 border border-danger-100 rounded-cards text-ease-body-sm font-normal animate-fade-in">{error}</div>}
      {success && <div className="p-ease-14 mb-ease-21 bg-mint-veil/50 text-forest-ink border border-mint-veil rounded-cards text-ease-body-sm font-normal animate-fade-in">{success}</div>}

      <div className="card p-0 overflow-hidden bg-linen-white">
        <div className="divide-y divide-hairline-gray">
          {DAYS.map((day) => (
            <div key={day} className="p-ease-21 flex flex-col sm:flex-row gap-ease-21 sm:items-start transition-colors hover:bg-linen group">
              <div className="w-40 flex-shrink-0 pt-2">
                <span className="text-ease-caption text-charcoal font-bold tracking-widest">{day}</span>
              </div>
              
              <div className="flex-1 space-y-ease-14">
                {(!schedule[day] || schedule[day].length === 0) ? (
                  <div className="text-ease-body-sm font-normal text-charcoal pt-2 flex items-center gap-2">
                    Unavailable
                  </div>
                ) : (
                  schedule[day].map((slot, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-ease-14">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(day, i, 'startTime', e.target.value)}
                        className="input font-mono w-auto min-w-[120px]"
                      />
                      <span className="text-charcoal font-medium text-ease-caption">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(day, i, 'endTime', e.target.value)}
                        className="input font-mono w-auto min-w-[120px]"
                      />
                      <button
                        onClick={() => handleRemoveSlot(day, i)}
                        className="p-2 text-charcoal hover:text-danger-700 hover:bg-danger-50 rounded-nav transition-colors"
                        title="Remove slot"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
                
                <button
                  onClick={() => handleAddSlot(day)}
                  className="text-ease-caption font-bold tracking-widest text-forest-ink hover:bg-mist-blue/30 px-ease-14 py-ease-7 rounded-nav flex items-center gap-1.5 transition-colors mt-2 inline-flex border border-hairline-gray"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Add slot
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export const DoctorSchedule: React.FC = () => {
  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-5xl mx-auto">
        <Suspense fallback={
          <div className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <div className="skeleton h-10 w-64 mb-2" />
                <div className="skeleton h-5 w-96" />
              </div>
              <div className="skeleton h-12 w-40 rounded-cards" />
            </div>
            <div className="skeleton h-[600px] rounded-cards" />
          </div>
        }>
          <ScheduleEditor />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default DoctorSchedule;
