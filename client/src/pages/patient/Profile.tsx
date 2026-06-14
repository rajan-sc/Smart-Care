import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppShell } from '../../layouts/AppShell';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../services/portal.api';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { changePasswordSchema, type ChangePasswordInput } from '../../validators';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();

  // ─── Profile Details Form ───────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => userApi.updateProfile(formData),
    onSuccess: () => {
      updateUser(formData);
      setSuccess('Profile updated successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
      setSuccess('');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const handleVerifyEmail = async () => {
    setVerifyLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/request-verification');
      setSuccess('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send verification email');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ─── Security Form (Change Password) ────────────────────────────────────────
  const [secSuccess, setSecSuccess] = useState('');
  const [secError, setSecError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit: handleSecSubmit, formState: { errors: secErrors, isSubmitting: isSecSubmitting }, reset: resetSecForm } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onChangePassword = async (data: ChangePasswordInput) => {
    setSecError('');
    setSecSuccess('');
    try {
      await api.patch('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSecSuccess('Password changed successfully!');
      resetSecForm();
      setTimeout(() => setSecSuccess(''), 5000);
    } catch (err: any) {
      setSecError(err.response?.data?.error?.message || 'Failed to change password');
    }
  };

  return (
    <AppShell>
      <div className="page-container py-ease-section max-w-3xl mx-auto space-y-12">
        <div className="animate-fade-in flex flex-col items-start">
          <span className="badge-pill mb-ease-14">Settings</span>
          <h1 className="text-ease-display font-display tracking-tight text-forest-ink">Profile Settings</h1>
        </div>

        {/* ── Profile Details Card ── */}
        <div className="card animate-slide-up bg-linen-white">
          <div className="flex items-center gap-ease-21 mb-ease-28 pb-ease-28 border-b border-hairline-gray">
            <div className="w-24 h-24 rounded-full bg-mist-blue flex items-center justify-center text-forest-ink text-3xl font-bold font-display tracking-tight">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink">
                {user?.firstName} {user?.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-ease-body-sm text-charcoal">{user?.email}</p>
                {user?.isVerified ? (
                  <span className="inline-flex items-center gap-1 font-mono text-ease-caption text-forest-ink bg-mint-veil px-2 py-0.5 rounded-badges">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono text-ease-caption text-charcoal bg-linen px-2 py-0.5 rounded-badges">
                    Unverified
                  </span>
                )}
              </div>
              <div className="mt-ease-14 flex items-center gap-ease-14">
                <span className="badge-pill bg-mist-blue text-forest-ink">{user?.role}</span>
                {!user?.isVerified && (
                  <button 
                    onClick={handleVerifyEmail}
                    disabled={verifyLoading}
                    className="text-ease-caption font-bold text-forest-ink hover:underline transition-colors disabled:opacity-50"
                  >
                    {verifyLoading ? 'Sending...' : 'Send Verification Link'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitProfile} className="space-y-ease-21">
            {error && <div className="p-ease-14 bg-danger-50 text-danger-700 rounded-cards text-ease-body-sm">{error}</div>}
            {success && <div className="p-ease-14 bg-mint-veil/50 text-forest-ink rounded-cards text-ease-body-sm">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-ease-21">
              <div className="space-y-1.5">
                <label className="label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="9999999999"
                className="input font-mono"
              />
            </div>

            <div className="pt-ease-21 flex justify-end">
              <Button
                type="submit"
                isLoading={updateMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* ── Security Card ── */}
        <div className="card animate-slide-up bg-linen-white" style={{ animationDelay: '0.1s' }}>
          <div className="mb-8">
            <h2 className="text-xl font-display font-semibold text-forest-ink">Security</h2>
            <p className="text-graphite text-sm mt-1">Update your password to keep your account secure.</p>
          </div>

          <form onSubmit={handleSecSubmit(onChangePassword)} className="space-y-6">
            {secError && (
              <div className="p-4 bg-danger-50 border border-danger-100 rounded-xl text-sm text-danger-600 flex gap-3 animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {secError}
              </div>
            )}
            {secSuccess && (
              <div className="p-4 bg-mint-veil/50 text-forest-ink rounded-xl text-sm flex gap-3 animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                {secSuccess}
              </div>
            )}

            <div className="space-y-1.5 max-w-md">
              <label className="block text-xs font-bold text-graphite uppercase tracking-widest">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  {...register('currentPassword')}
                  className="input w-full rounded-xl pr-10 focus:ring-forest-ink transition-all shadow-sm bg-white"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={showCurrent ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                  </svg>
                </button>
              </div>
              {secErrors.currentPassword && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{secErrors.currentPassword.message}</p>}
            </div>

            <div className="space-y-1.5 max-w-md">
              <label className="block text-xs font-bold text-graphite uppercase tracking-widest">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  {...register('newPassword')}
                  className="input w-full rounded-xl pr-10 focus:ring-forest-ink transition-all shadow-sm bg-white"
                  placeholder="Create a strong password"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={showNew ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-graphite/70 mt-2 leading-relaxed">
                Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
              </p>
              {secErrors.newPassword && <p className="text-xs text-danger-500 mt-1 animate-fade-in leading-relaxed">{secErrors.newPassword.message}</p>}
            </div>

            <div className="space-y-1.5 max-w-md">
              <label className="block text-xs font-bold text-graphite uppercase tracking-widest">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  className="input w-full rounded-xl pr-10 focus:ring-forest-ink transition-all shadow-sm bg-white"
                  placeholder="Confirm your new password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={showConfirm ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                  </svg>
                </button>
              </div>
              {secErrors.confirmPassword && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{secErrors.confirmPassword.message}</p>}
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" isLoading={isSecSubmitting}>
                Update Password
              </Button>
            </div>
          </form>
        </div>

      </div>
    </AppShell>
  );
};

export default ProfilePage;
