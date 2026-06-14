import React, { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AppShell } from '../../layouts/AppShell';
import { doctorApi } from '../../services/portal.api';
import { VitalsChart } from '../../components/VitalsChart';

const PatientDetailContent: React.FC<{ id: string }> = ({ id }) => {
  const navigate = useNavigate();

  const { data: patients } = useSuspenseQuery({
    queryKey: ['doctor-patients'],
    queryFn: () => doctorApi.getPatients().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: vitals } = useSuspenseQuery({
    queryKey: ['doctor-patient-vitals', id],
    queryFn: () => doctorApi.getPatientVitals(id).then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const { data: medications } = useSuspenseQuery({
    queryKey: ['doctor-patient-medications', id],
    queryFn: () => doctorApi.getPatientMedications(id).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: records } = useSuspenseQuery({
    queryKey: ['doctor-patient-records', id],
    queryFn: () => doctorApi.getPatientRecords(id).then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
  });

  const patient = patients?.find((p: any) => p.id === id);

  return (
    <>
      <button 
        onClick={() => navigate('/doctor/patients')}
        className="text-sm font-bold uppercase tracking-widest text-charcoal hover:text-forest-ink flex items-center gap-2 mb-8 transition-colors bg-linen-white px-4 py-2 rounded-buttons border border-hairline-gray hover:bg-mint-veil/20 w-max"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to My Patients
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-fade-in">
        <div>
          <h1 className="text-4xl font-display font-semibold tracking-tight text-forest-ink mb-2 flex items-center gap-4">
            {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient Details'}
          </h1>
          <p className="text-graphite font-medium">
            {patient?.email || 'Loading details...'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Top Full-Width Row - Vitals */}
        <div className="card p-8 bg-linen-white border border-hairline-gray rounded-cards w-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold tracking-tight text-forest-ink flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-mist-blue/30 text-forest-ink flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </div>
              Vitals History
            </h3>
          </div>
          {vitals && vitals.length > 0 ? (
            <VitalsChart vitals={vitals} />
          ) : (
            <div className="p-12 text-center text-charcoal border border-hairline-gray rounded-cards bg-mint-veil/10">
              <h4 className="font-bold text-lg mb-1 text-forest-ink">No vitals recorded</h4>
              <p className="text-sm font-medium">Patient hasn't logged any vitals recently.</p>
            </div>
          )}
        </div>

        {/* Symmetrical 2x2 Grid for the four uniform cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Medications */}
          <div className="card p-0 overflow-hidden bg-linen-white border border-hairline-gray rounded-cards flex flex-col">
            <div className="p-6 border-b border-hairline-gray bg-mint-veil/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sage-wash/50 text-forest-ink flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-forest-ink">Medications</h3>
            </div>
            <div className="divide-y divide-hairline-gray bg-linen-white max-h-[400px] overflow-y-auto custom-scrollbar">
              {medications && medications.length > 0 ? (
                medications.map((med: any) => (
                  <div key={med.id} className="p-5 hover:bg-mint-veil/10 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-forest-ink">{med.name}</p>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-widest bg-mist-blue/20 text-forest-ink border border-forest-ink/10">{med.frequency}</span>
                    </div>
                    <p className="text-sm font-medium text-graphite">{med.dosage} {med.unit}</p>
                    {med.instructions && (
                      <p className="text-xs font-medium text-forest-ink mt-3 bg-mint-veil/30 border border-forest-ink/10 p-3 rounded-lg flex items-start gap-2">
                        <span className="text-forest-ink">ℹ️</span>
                        {med.instructions}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-charcoal">
                  No active medications.
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Recent Measurements */}
          <div className="card p-0 overflow-hidden bg-linen-white border border-hairline-gray rounded-cards flex flex-col">
            <div className="p-6 border-b border-hairline-gray bg-mint-veil/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-mist-blue/30 text-forest-ink flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-forest-ink">Recent Measurements</h3>
            </div>
            <div className="divide-y divide-hairline-gray max-h-[400px] overflow-y-auto custom-scrollbar bg-linen-white">
              {vitals?.map((vital: any) => (
                <div key={vital.id} className="p-5 flex justify-between items-center hover:bg-mint-veil/10 transition-colors">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm bg-mist-blue/20 text-forest-ink">
                      {vital.vitalType === 'BLOOD_PRESSURE' ? 'BP' : 
                       vital.vitalType === 'GLUCOSE' ? 'GL' : 
                       vital.vitalType === 'PULSE' ? 'HR' : 
                       vital.vitalType === 'WEIGHT' ? 'WT' :
                       vital.vitalType === 'TEMPERATURE' ? 'TMP' :
                       vital.vitalType === 'OXYGEN_SATURATION' ? 'O2' : 'VT'}
                    </div>
                    <div>
                      <p className="font-bold text-forest-ink text-lg tracking-tight">
                        {vital.vitalType === 'BLOOD_PRESSURE' 
                          ? `${vital.values?.systolic}/${vital.values?.diastolic} mmHg`
                          : vital.vitalType === 'GLUCOSE' 
                          ? `${vital.values?.value} mg/dL`
                          : vital.vitalType === 'WEIGHT'
                          ? `${vital.values?.value} ${vital.values?.unit || 'kg'}`
                          : vital.vitalType === 'PULSE'
                          ? `${vital.values?.value} bpm`
                          : vital.vitalType === 'TEMPERATURE'
                          ? `${vital.values?.value} °F`
                          : vital.vitalType === 'OXYGEN_SATURATION'
                          ? `${vital.values?.value}%`
                          : `${vital.values?.value || 'Recorded'}`}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-widest text-graphite mt-1">
                        {format(parseISO(vital.recordedAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Medical Records */}
          <div className="card p-0 overflow-hidden bg-linen-white border border-hairline-gray rounded-cards flex flex-col">
            <div className="p-6 border-b border-hairline-gray bg-mint-veil/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-mist-blue/30 text-forest-ink flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-forest-ink">Medical Records</h3>
            </div>
            <div className="divide-y divide-hairline-gray bg-linen-white max-h-[400px] overflow-y-auto custom-scrollbar">
              {records && records.length > 0 ? (
                records.map((record: any) => (
                  <div key={record.id} className="p-5 hover:bg-mint-veil/10 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-bold text-forest-ink tracking-tight">{record.name}</p>
                      <p className="text-sm font-medium text-graphite mt-1">
                        {format(parseISO(record.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <a 
                      href={record.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-mint-veil/30 hover:bg-mint-veil text-forest-ink rounded-lg text-xs font-bold uppercase tracking-widest border border-forest-ink/10 transition-colors"
                    >
                      View
                    </a>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-charcoal">
                  No medical records found.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return (
    <AppShell>
      <div className="page-container py-10 max-w-7xl mx-auto">
        <Suspense fallback={
          <div className="space-y-10">
            <div className="skeleton h-10 w-40 rounded-xl" />
            <div>
              <div className="skeleton h-12 w-64 mb-3" />
              <div className="skeleton h-5 w-48" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-8">
                <div className="skeleton h-96 rounded-3xl" />
                <div className="skeleton h-64 rounded-3xl" />
              </div>
              <div className="skeleton h-96 rounded-3xl" />
            </div>
          </div>
        }>
          <PatientDetailContent id={id} />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default PatientDetail;
