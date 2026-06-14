import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientApi } from '../../services/portal.api';
import { AppShell } from '../../layouts/AppShell';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmProvider';
import { format } from 'date-fns';

const PERMISSION_OPTIONS = [
  { id: 'VIEW_VITALS', label: 'Vitals & Metrics' },
  { id: 'VIEW_MEDICATIONS', label: 'Medications' },
  { id: 'VIEW_APPOINTMENTS', label: 'Appointments' },
  { id: 'RECEIVE_ALERTS', label: 'Critical Alerts' }
];

export const Caregivers: React.FC = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Family Member');
  const [permissions, setPermissions] = useState<string[]>(['VIEW_VITALS', 'VIEW_MEDICATIONS', 'RECEIVE_ALERTS']);

  const { data: caregivers, isLoading } = useQuery({
    queryKey: ['my-caregivers'],
    queryFn: () => patientApi.getMyCaregivers().then(r => r.data.data)
  });

  const inviteMutation = useMutation({
    mutationFn: () => patientApi.linkCaregiver({ caregiverEmail: email, relationship, permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-caregivers'] });
      showToast('Caregiver invited successfully', 'success');
      setIsInviteModalOpen(false);
      setEmail('');
      setPermissions(['VIEW_VITALS', 'VIEW_MEDICATIONS', 'RECEIVE_ALERTS']);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error?.message || 'Failed to invite caregiver', 'error');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => patientApi.revokeCaregiverLink(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-caregivers'] });
      showToast('Access revoked successfully', 'success');
    },
    onError: () => {
      showToast('Failed to revoke access', 'error');
    }
  });

  const togglePermission = (id: string) => {
    setPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate();
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-forest-ink"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-5xl mx-auto">
        
        {/* Header Thesis */}
        <div className="mb-ease-section animate-fade-in flex flex-col md:flex-row md:items-end justify-between gap-ease-14">
          <div className="flex flex-col items-start">
            <span className="badge-pill mb-ease-14 bg-mist-blue text-forest-ink">Access Control</span>
            <h1 className="text-ease-display font-display tracking-tight text-forest-ink">Care Team</h1>
            <p className="text-ease-body text-charcoal max-w-2xl mt-ease-14">
              Manage who has access to your health data. You have absolute control over your privacy and can securely revoke access at any time.
            </p>
          </div>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-2 px-6 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Caregiver
          </button>
        </div>

        {/* Access Badges */}
        <div className="grid gap-ease-21 md:grid-cols-2 lg:grid-cols-3 animate-slide-up">
          {caregivers?.length === 0 ? (
            <div className="col-span-full card bg-linen-white flex flex-col items-center justify-center text-center py-ease-section">
              <div className="w-20 h-20 bg-mint-veil rounded-full flex items-center justify-center text-forest-ink mb-ease-14">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-ease-7">No Active Caregivers</h3>
              <p className="text-ease-body text-charcoal max-w-sm">
                Your data is completely private. You can invite a trusted family member or nurse to monitor your health.
              </p>
            </div>
          ) : (
            caregivers?.map((link: any) => (
              <div key={link.id} className="card bg-linen-white flex flex-col hover:border-forest-ink/20 transition-all duration-300">
                <div className="flex justify-between items-start mb-ease-14">
                  <div>
                    <h3 className="text-ease-subheading font-display tracking-tight text-forest-ink truncate">
                      {link.caregiver.firstName} {link.caregiver.lastName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge-pill bg-mint-veil text-forest-ink text-xs px-2 py-0.5">
                        {link.relationship}
                      </span>
                      <span className={`badge-pill text-xs px-2 py-0.5 ${
                        link.status === 'ACTIVE' ? 'bg-forest-ink text-linen-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {link.status}
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-mist-blue flex items-center justify-center text-forest-ink font-bold font-display tracking-tight shrink-0">
                    {link.caregiver.firstName[0]}{link.caregiver.lastName[0]}
                  </div>
                </div>

                <div className="flex-1 mt-ease-7">
                  <p className="text-ease-caption font-bold text-charcoal uppercase tracking-wider mb-ease-7">Authorized Access</p>
                  <div className="flex flex-wrap gap-2">
                    {link.permissions.map((perm: string) => {
                      const option = PERMISSION_OPTIONS.find(p => p.id === perm);
                      return (
                        <span key={perm} className="inline-flex items-center gap-1.5 bg-white border border-hairline-gray text-forest-ink px-2.5 py-1 rounded text-ease-caption font-medium shadow-subtle">
                          <svg className="w-3 h-3 text-mint-veil stroke-forest-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          {option ? option.label : perm}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-ease-21 pt-ease-14 border-t border-hairline-gray flex items-center justify-between">
                  <span className="text-ease-caption text-charcoal">
                    Linked {format(new Date(link.createdAt), 'MMM dd, yyyy')}
                  </span>
                  <button
                    onClick={async () => {
                      const isConfirmed = await confirm({
                        title: 'Revoke caregiver access?',
                        message: 'This will completely remove their ability to view your records or receive alerts.',
                        confirmText: 'Revoke access',
                        cancelText: 'Keep access',
                        isDestructive: true,
                      });
                      if (isConfirmed) {
                        revokeMutation.mutate(link.id);
                      }
                    }}
                    disabled={revokeMutation.isPending}
                    className="text-ease-caption font-bold text-danger-600 hover:text-danger-800 uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite Caregiver">
          <form onSubmit={handleInvite} className="space-y-ease-21 mt-ease-14">
            <div className="space-y-2">
              <label className="label">Caregiver Email</label>
              <input
                type="email"
                required
                className="input"
                placeholder="caregiver@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-ease-caption text-charcoal mt-1">They must already have a registered Caregiver account.</p>
            </div>

            <div className="space-y-2">
              <label className="label">Relationship</label>
              <select
                className="input bg-white"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
              >
                <option value="Family Member">Family Member</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Parent">Parent</option>
                <option value="Private Nurse">Private Nurse</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="label">Data Permissions</label>
              <div className="space-y-2 bg-linen-white p-ease-14 rounded-xl border border-hairline-gray">
                {PERMISSION_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-3 p-1 cursor-pointer group">
                    <div className={`w-5 h-5 flex items-center justify-center rounded border transition-colors ${
                      permissions.includes(opt.id) 
                        ? 'bg-forest-ink border-forest-ink' 
                        : 'bg-white border-hairline-gray group-hover:border-forest-ink'
                    }`}>
                      {permissions.includes(opt.id) && (
                        <svg className="w-3.5 h-3.5 text-linen-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-ease-body-sm font-medium text-forest-ink">{opt.label}</span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={permissions.includes(opt.id)}
                      onChange={() => togglePermission(opt.id)}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-ease-14 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-ease-body-sm font-bold text-charcoal hover:text-forest-ink uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteMutation.isPending || permissions.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
};
