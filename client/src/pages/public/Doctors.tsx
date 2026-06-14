import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

export const DoctorsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Reset to page 1 if search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm]);

  const { data: result, isLoading } = useQuery({
    queryKey: ['public-doctors', debouncedSearchTerm, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: page.toString(), limit: '9' });
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      
      return api.get<{ success: boolean; data: any[]; pagination: any }>(`/doctors?${params.toString()}`).then(r => r.data);
    },
  });

  const doctors = result?.data || [];
  const pagination = result?.pagination;

  return (
    <div className="min-h-screen bg-linen-white">
      {/* Simple Public Header */}
      <header className="bg-linen-white border-b border-hairline-gray sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-forest-ink font-bold tracking-tight">
            <div className="w-8 h-8 rounded-nav bg-mist-blue flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-forest-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            Smart Care
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-ease-body-sm font-semibold text-charcoal hover:text-forest-ink transition-colors uppercase tracking-wide">Log in</Link>
            <Link to="/register" className="btn-primary py-2 px-4 rounded-nav uppercase tracking-widest text-xs">Sign up</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-ease-section">
        <div className="text-center max-w-2xl mx-auto mb-ease-section animate-fade-in">
          <span className="badge-pill mb-ease-14">Directory</span>
          <h1 className="text-5xl md:text-6xl font-display tracking-tight text-forest-ink mb-4">Find a Specialist</h1>
          <p className="text-lg text-charcoal">
            Connect with top healthcare professionals tailored to your needs. Book an appointment today.
          </p>
        </div>

        {/* Search */}
        <div className="bg-linen p-ease-14 rounded-cards border border-hairline-gray max-w-4xl mx-auto mb-ease-section animate-slide-up">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal">
               <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Search by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input w-full pl-11 py-3"
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-ease-section">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card p-ease-21 min-h-[250px] flex flex-col items-center justify-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-mist-blue/30 animate-pulse border border-hairline-gray"></div>
                <div className="w-32 h-5 bg-linen rounded animate-pulse"></div>
                <div className="w-24 h-4 bg-linen rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-ease-section animate-fade-in">
            {doctors.map(doc => (
              <div key={doc.id} className="card p-ease-21 flex flex-col group hover:border-forest-ink transition-colors cursor-default">
                <div className="flex items-start gap-ease-14 mb-ease-14">
                  <div className="w-16 h-16 rounded-full bg-mist-blue text-forest-ink flex items-center justify-center font-display text-2xl flex-shrink-0 tracking-tight">
                    {doc.firstName[0]}{doc.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-xl text-forest-ink tracking-tight leading-tight">
                      Dr. {doc.firstName} {doc.lastName}
                    </h3>
                    <p className="text-forest-ink font-mono text-ease-caption mb-1 opacity-70">
                      {doc.doctorProfile?.specialization || 'General Practice'}
                    </p>
                  </div>
                </div>
                
                <div className="text-ease-body-sm text-charcoal mb-ease-21 flex-1 flex flex-col gap-2 mt-2">
                  <div className="flex justify-between items-start">
                    <span className="opacity-70">Clinic</span>
                    <span className="font-semibold text-right">{doc.doctorProfile?.clinicName || 'Smart Care Clinic'}</span>
                  </div>
                  {doc.doctorProfile?.clinicAddress && (
                    <div className="flex justify-between items-start">
                      <span className="opacity-70">Address</span>
                      <span className="text-right truncate max-w-[150px]">{doc.doctorProfile.clinicAddress}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start mt-2 pt-2 border-t border-hairline-gray/50">
                    <span className="opacity-70">Consultation</span>
                    <span className="font-mono text-forest-ink font-semibold">${doc.doctorProfile?.consultationFee || '100.00'}</span>
                  </div>
                </div>
                
                <div className="mt-auto flex gap-ease-7">
                  <Link to="/login" className="btn-primary w-full text-center py-2.5">
                    Book Visit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-ease-56 text-center animate-fade-in max-w-2xl mx-auto bg-linen-white">
            <div className="w-20 h-20 bg-mist-blue text-forest-ink rounded-full flex items-center justify-center mx-auto mb-ease-14">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-2">No doctors found</h3>
            <p className="text-charcoal max-w-md mx-auto">
              We couldn't find any specialists matching "{searchTerm}". Try adjusting your search criteria.
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-ease-section flex justify-center items-center gap-4">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 border border-hairline-gray rounded bg-linen-white hover:bg-mist-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-charcoal text-sm font-mono">
              Page {page} of {pagination.totalPages}
            </span>
            <button 
              disabled={page === pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              className="px-4 py-2 border border-hairline-gray rounded bg-linen-white hover:bg-mist-blue/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorsPage;
