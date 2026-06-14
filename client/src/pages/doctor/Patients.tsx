import React, { useState, useMemo, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';
import { AppShell } from '../../layouts/AppShell';
import { doctorApi } from '../../services/portal.api';

const PatientList: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: patients } = useSuspenseQuery({
    queryKey: ['doctor-patients'],
    queryFn: () => doctorApi.getPatients().then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    return patients.filter((p: any) => {
      const q = searchQuery.toLowerCase();
      return (
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    });
  }, [patients, searchQuery]);

  const totalPages = Math.ceil(filteredPatients.length / pageSize) || 1;
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!patients || patients.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 border-2 border-dashed border-hairline-gray rounded-3xl bg-linen-white">
        <div className="w-16 h-16 bg-mist-blue/20 rounded-2xl flex items-center justify-center text-forest-ink mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </div>
        <h3 className="text-xl font-display font-semibold text-forest-ink mb-2 tracking-tight">No patients yet</h3>
        <p className="text-graphite font-medium">Patients will appear here after booking appointments.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center gap-3 p-2 bg-linen-white rounded-cards border border-hairline-gray focus-within:border-mint-veil focus-within:ring-2 focus-within:ring-mint-veil/50 transition-all shadow-sm">
        <div className="pl-4 text-graphite">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search patients by name or email..." 
          className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-forest-ink placeholder-graphite/60 py-2.5 text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List Container */}
      <div className="card p-0 overflow-hidden bg-linen-white border border-hairline-gray rounded-cards shadow-sm">
        {paginatedPatients.length > 0 ? (
          <div className="divide-y divide-hairline-gray">
            {paginatedPatients.map((patient: any) => (
              <div 
                key={patient.id} 
                className="flex items-center justify-between p-5 hover:bg-mint-veil/10 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-mist-blue/30 text-forest-ink font-bold text-lg">
                    {patient.firstName[0]}{patient.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-forest-ink tracking-tight">
                      {patient.firstName} {patient.lastName}
                    </h3>
                    <p className="text-sm font-medium text-graphite mt-0.5">
                      {patient.email} {patient.phone ? `• ${patient.phone}` : ''}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/doctor/patients/${patient.id}`)}
                  className="px-5 py-2.5 bg-mint-veil/30 hover:bg-mint-veil text-forest-ink rounded-lg text-xs font-bold uppercase tracking-widest border border-forest-ink/10 transition-all group-hover:bg-mint-veil group-hover:shadow-sm"
                >
                  View History
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-graphite">
            No patients match your search "{searchQuery}".
          </div>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-hairline-gray bg-linen flex items-center justify-between">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-bold text-charcoal bg-white border border-hairline-gray rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-mist-blue/30 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-graphite">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm font-bold text-charcoal bg-white border border-hairline-gray rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-mist-blue/30 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Patients: React.FC = () => {
  return (
    <AppShell>
      <div className="page-container py-10 max-w-4xl mx-auto">
        <div className="flex justify-between items-end mb-10 animate-fade-in">
          <div>
            <h1 className="text-4xl font-display font-semibold tracking-tight text-forest-ink mb-2">My Patients</h1>
            <p className="text-graphite font-medium">View medical history for your patients</p>
          </div>
        </div>

        <Suspense fallback={
          <div className="space-y-6">
            <div className="skeleton h-14 rounded-cards w-full" />
            <div className="skeleton h-[600px] rounded-cards w-full" />
          </div>
        }>
          <PatientList />
        </Suspense>
      </div>
    </AppShell>
  );
};

export default Patients;
