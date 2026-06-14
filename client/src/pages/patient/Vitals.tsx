import React, { useState, Suspense } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../layouts/AppShell';
import { patientApi } from '../../services/portal.api';
import { VitalsChart } from '../../components/VitalsChart';

type VitalType = 'BLOOD_PRESSURE' | 'GLUCOSE' | 'WEIGHT' | 'PULSE' | 'TEMPERATURE' | 'OXYGEN_SATURATION';

const VitalsDisplay: React.FC = () => {
  const { data: vitals } = useSuspenseQuery({
    queryKey: ['vitals'],
    queryFn: () => patientApi.getVitals(100).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  if (!vitals || vitals.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-ease-56 text-charcoal bg-linen-white min-h-[400px]">
        <h3 className="font-normal text-ease-body-sm mb-1">No vitals logged yet.</h3>
        <p className="text-ease-caption">Use the form to add your first health reading.</p>
      </div>
    );
  }

  return <VitalsChart vitals={vitals} title="All Historical Trends" />;
};

export const VitalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<VitalType>('BLOOD_PRESSURE');
  
  // Form State
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [bpPulse, setBpPulse] = useState('');
  const [value, setValue] = useState('');
  const [isFasting, setIsFasting] = useState(false);
  const [unit, setUnit] = useState<'kg'|'lbs'>('kg');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const logMutation = useMutation({
    mutationFn: (payload: { vitalType: string; values: Record<string, any>; notes?: string }) => 
      patientApi.logVital(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vitals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Reset form
      setSystolic('');
      setDiastolic('');
      setBpPulse('');
      setValue('');
      setIsFasting(false);
      setUnit('kg');
      setNotes('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to log vital. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let payloadValues: Record<string, any> = {};

    if (activeTab === 'BLOOD_PRESSURE') {
      const sys = parseInt(systolic, 10);
      const dia = parseInt(diastolic, 10);
      if (isNaN(sys) || isNaN(dia)) return setError('Please enter valid numbers');
      if (sys < 50 || sys > 300) return setError('Systolic must be between 50 and 300');
      if (dia < 30 || dia > 200) return setError('Diastolic must be between 30 and 200');
      if (sys <= dia) return setError('Systolic must be higher than diastolic');
      
      payloadValues = { systolic: sys, diastolic: dia };
      if (bpPulse) {
        const p = parseInt(bpPulse, 10);
        if (isNaN(p) || p < 30 || p > 250) return setError('Pulse must be between 30 and 250 bpm');
        payloadValues.pulse = p;
      }
    } else if (activeTab === 'GLUCOSE') {
      const val = parseFloat(value);
      if (isNaN(val)) return setError('Please enter a valid number');
      if (val < 20 || val > 1000) return setError('Glucose must be between 20 and 1000 mg/dL');
      payloadValues = { value: val, isFasting };
    } else if (activeTab === 'WEIGHT') {
      const val = parseFloat(value);
      if (isNaN(val)) return setError('Please enter a valid number');
      if (val <= 0) return setError('Weight must be positive');
      payloadValues = { value: val, unit };
    } else {
      const val = parseFloat(value);
      if (isNaN(val)) return setError('Please enter a valid number');
      if (val <= 0) return setError('Value must be positive');
      payloadValues = { value: val };
    }

    logMutation.mutate({
      vitalType: activeTab,
      values: payloadValues,
      notes: notes.trim() || undefined,
    });
  };

  const tabs: { id: VitalType; label: string; icon: string }[] = [
    { id: 'BLOOD_PRESSURE', label: 'Blood Pressure', icon: 'BP' },
    { id: 'GLUCOSE', label: 'Glucose', icon: 'GL' },
    { id: 'WEIGHT', label: 'Weight', icon: 'WT' },
    { id: 'TEMPERATURE', label: 'Temperature', icon: 'TP' },
    { id: 'OXYGEN_SATURATION', label: 'SpO2', icon: 'O2' },
  ];

  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-7xl mx-auto">
        <div className="mb-ease-section animate-fade-in flex flex-col items-start">
          <span className="badge-pill mb-ease-14">Monitoring</span>
          <h1 className="text-ease-display font-display tracking-tight text-forest-ink">Vitals Tracker</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-ease-section">
          {/* Left Column: Form */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8 bg-linen-white">
              <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-ease-21">Log New Reading</h3>

              {/* Tabs */}
              <div className="flex flex-wrap gap-ease-7 mb-ease-21">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { 
                      setActiveTab(tab.id); 
                      setError(''); 
                      setValue(''); 
                      setSystolic(''); 
                      setDiastolic(''); 
                      setBpPulse(''); 
                    }}
                    className={`flex items-center gap-ease-7 px-ease-14 py-ease-7 rounded-nav text-ease-caption font-bold tracking-widest transition-colors border
                      ${activeTab === tab.id 
                        ? 'bg-mist-blue text-forest-ink border-forest-ink' 
                        : 'bg-linen text-charcoal hover:bg-mist-blue/30 border-transparent'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-ease-21">
                {error && (
                  <div className="p-ease-14 bg-danger-50 border border-danger-100 rounded-cards text-ease-body-sm text-danger-700 font-normal animate-fade-in">
                    {error}
                  </div>
                )}

                {activeTab === 'BLOOD_PRESSURE' ? (
                  <div className="grid grid-cols-2 gap-ease-14">
                    <div className="space-y-1.5">
                      <label className="label">Systolic (mmHg)</label>
                      <input 
                        type="number" required min="50" max="250"
                        value={systolic} onChange={(e) => setSystolic(e.target.value)}
                        className="input" placeholder="120"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="label">Diastolic (mmHg)</label>
                      <input 
                        type="number" required min="30" max="150"
                        value={diastolic} onChange={(e) => setDiastolic(e.target.value)}
                        className="input" placeholder="80"
                      />
                    </div>
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <label className="label">Pulse (bpm) <span className="text-charcoal/50 text-xs font-normal ml-1">(Optional)</span></label>
                      <input 
                        type="number" min="30" max="250"
                        value={bpPulse} onChange={(e) => setBpPulse(e.target.value)}
                        className="input" placeholder="72"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="label">
                        {activeTab === 'GLUCOSE' ? 'Glucose Level (mg/dL)' : 
                         activeTab === 'WEIGHT' ? 'Weight' : 
                         activeTab === 'PULSE' ? 'Heart Rate (bpm)' : 
                         activeTab === 'TEMPERATURE' ? 'Temperature (°F)' : 
                         'Oxygen Saturation (%)'}
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        required
                        value={value} 
                        onChange={(e) => setValue(e.target.value)}
                        className="input" 
                        placeholder={
                          activeTab === 'GLUCOSE' ? 'e.g. 100' :
                          activeTab === 'WEIGHT' ? 'e.g. 70' :
                          activeTab === 'PULSE' ? 'e.g. 75' :
                          activeTab === 'TEMPERATURE' ? 'e.g. 98.6' :
                          'e.g. 98'
                        }
                      />
                    </div>
                    {activeTab === 'GLUCOSE' && (
                      <label className="flex items-center gap-2 text-ease-body-sm text-charcoal cursor-pointer">
                        <input type="checkbox" checked={isFasting} onChange={(e) => setIsFasting(e.target.checked)} className="rounded border-hairline-gray text-forest-ink focus:ring-forest-ink" />
                        <span>Fasting measurement</span>
                      </label>
                    )}
                    {activeTab === 'WEIGHT' && (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 text-ease-body-sm text-charcoal cursor-pointer">
                          <input type="radio" name="unit" checked={unit === 'kg'} onChange={() => setUnit('kg')} className="text-forest-ink focus:ring-forest-ink" />
                          <span>kg</span>
                        </label>
                        <label className="flex items-center gap-2 text-ease-body-sm text-charcoal cursor-pointer">
                          <input type="radio" name="unit" checked={unit === 'lbs'} onChange={() => setUnit('lbs')} className="text-forest-ink focus:ring-forest-ink" />
                          <span>lbs</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="label">Notes (optional)</label>
                  <input 
                    type="text" 
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="input" placeholder="How are you feeling?"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={logMutation.isPending}
                  className="w-full btn-primary disabled:opacity-50 mt-ease-14"
                >
                  {logMutation.isPending ? 'Saving...' : 'Save Reading'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Charts */}
          <div className="lg:col-span-2">
            <Suspense fallback={
              <div className="card h-[600px] flex items-center justify-center bg-linen-white">
                <div className="skeleton w-full h-full rounded-cards" />
              </div>
            }>
              <div className="card bg-linen-white h-[600px]">
                 <VitalsDisplay />
              </div>
            </Suspense>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default VitalsPage;
