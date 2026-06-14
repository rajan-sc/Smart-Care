import React, { useState, Suspense } from 'react';
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../layouts/AppShell';
import { patientApi } from '../../services/portal.api';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';
import dayjs from 'dayjs';

interface MedicalRecord {
  id: string;
  name: string;
  fileUrl: string;
  createdAt: string;
}

const RecordsList: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const { data: records } = useSuspenseQuery({
    queryKey: ['medicalRecords'],
    queryFn: async () => {
      const res = await patientApi.getMyRecords();
      return res.data?.data as MedicalRecord[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return patientApi.deleteRecord(id);
    },
    onSuccess: () => {
      showToast('Record deleted successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['medicalRecords'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error?.message || 'Failed to delete record', 'error');
    },
  });

  if (!records || records.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center p-ease-56 text-charcoal bg-linen-white">
         <h3 className="font-normal text-ease-body-sm mb-1">No records found.</h3>
         <p className="text-ease-caption">Upload your first medical report to see it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-ease-14">
      {records.map((record) => (
        <div 
          key={record.id}
          className="card flex flex-col sm:flex-row items-start sm:items-center justify-between"
        >
          <div className="flex items-center gap-ease-14 mb-ease-14 sm:mb-0">
            <div className="w-14 h-14 rounded-cards bg-mist-blue text-forest-ink flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
            </div>
            <div>
              <h4 className="font-bold text-ease-body text-forest-ink tracking-tight">{record.name}</h4>
              <div className="flex items-center gap-2 font-mono text-ease-body-sm text-charcoal mt-1">
                {dayjs(record.createdAt).format('MMM D, YYYY — h:mm A')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-ease-7 w-full sm:w-auto">
            <a 
              href={record.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex justify-center items-center px-ease-14 py-ease-7 bg-linen hover:bg-mist-blue/30 text-forest-ink rounded-nav transition-colors text-ease-caption border border-hairline-gray"
            >
              View File
            </a>
            <button
              onClick={async () => {
                const isConfirmed = await confirm({
                  title: 'Delete medical record?',
                  message: 'This record will be permanently deleted from your profile.',
                  confirmText: 'Delete record',
                  cancelText: 'Keep record',
                  isDestructive: true,
                });
                if (isConfirmed) {
                  deleteMutation.mutate(record.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="px-ease-14 py-ease-7 text-danger-700 hover:bg-danger-50 rounded-nav transition-colors border border-transparent hover:border-danger-100 text-ease-caption"
            >
              {deleteMutation.isPending && deleteMutation.variables === record.id ? (
                '...'
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MedicalRecordsPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [recordName, setRecordName] = useState('');
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return patientApi.uploadRecord(formData);
    },
    onSuccess: () => {
      showToast('Record uploaded successfully', 'success');
      setFile(null);
      setRecordName('');
      queryClient.invalidateQueries({ queryKey: ['medicalRecords'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error?.message || 'Failed to upload record', 'error');
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !recordName.trim()) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', recordName);
    uploadMutation.mutate(formData);
  };

  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-7xl mx-auto">
        <div className="mb-ease-section animate-fade-in flex flex-col items-start">
          <span className="badge-pill mb-ease-14">Documents</span>
          <h1 className="text-ease-display font-display tracking-tight text-forest-ink">
            Medical Records
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-ease-section">
          {/* Upload Form */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8 bg-linen-white border border-forest-ink">
              <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-ease-21 flex items-center gap-3 border-b border-hairline-gray pb-ease-14">
                Upload New Record
              </h2>
              <form onSubmit={handleUpload} className="space-y-ease-21">
                <div className="space-y-1.5">
                  <label className="label">
                    Report Name
                  </label>
                  <input
                    type="text"
                    required
                    value={recordName}
                    onChange={(e) => setRecordName(e.target.value)}
                    placeholder="e.g. Blood Test - DATE"
                    className="input"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="label">
                    File Document
                  </label>
                  <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border border-hairline-gray rounded-cards transition-all bg-linen
                    ${file ? 'border-forest-ink' : 'hover:border-forest-ink'}`}>
                    <div className="space-y-2 text-center flex flex-col items-center">
                      <div className="flex text-sm text-charcoal justify-center mb-2">
                        <label className="relative cursor-pointer rounded-md font-bold text-forest-ink hover:text-charcoal focus-within:outline-none transition-colors">
                          <span>{file ? 'Change file' : 'Click to upload'}</span>
                          <input
                            type="file"
                            className="sr-only"
                            required
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                      <p className="text-ease-caption text-charcoal">
                        {file ? file.name : 'PDF, PNG, JPG up to 10MB'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!file || !recordName || uploadMutation.isPending}
                  className="w-full btn-primary disabled:opacity-40"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Record'}
                </button>
              </form>
            </div>
          </div>

          {/* Records List */}
          <div className="lg:col-span-2">
            <div className="card min-h-[500px]">
              <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-ease-21 flex items-center gap-3">
                Your Cloud Records
              </h2>
              
              <Suspense fallback={
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-[90px] rounded-cards" />)}
                </div>
              }>
                <RecordsList />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default MedicalRecordsPage;
