import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordInput } from '../../validators';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordInput) => {
    setApiError('');
    try {
      await api.post('/auth/reset-password', { token, newPassword: data.password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Failed to reset password');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-linen-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center bg-white py-12 px-8 shadow-xl shadow-forest-ink/5 rounded-[32px] border border-hairline-gray/30">
          <div className="w-16 h-16 bg-danger-50 text-danger-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="text-3xl font-bold font-display text-forest-ink mb-4 tracking-tight">Invalid Link</h2>
          <p className="text-graphite font-medium mb-8">No reset token provided. Please use the exact link from your email.</p>
          <Link to="/forgot-password" className="w-full">
            <Button className="w-full" size="lg">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linen-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-mint-veil selection:text-forest-ink transition-colors relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-slide-up relative z-10 text-center">
        <Link to="/" className="inline-flex items-center justify-center gap-3 text-forest-ink font-display font-semibold text-3xl tracking-tight mb-8">
          <div className="w-12 h-12 rounded-2xl bg-forest-ink flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-linen-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          Smart Care
        </Link>
        <h2 className="mt-6 text-center text-4xl font-display font-semibold text-forest-ink tracking-tight">
          Create new password
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-fade-in relative z-10">
        <div className="bg-white py-10 px-8 shadow-xl shadow-forest-ink/5 rounded-[32px] border border-hairline-gray/30">
          {success ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-mint-veil text-forest-ink rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold font-display text-forest-ink mb-3">Password Reset Successfully</h3>
              <p className="text-graphite mb-6 leading-relaxed">
                You can now log in with your new password.<br/>Redirecting you to login...
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {apiError && (
                <div className="p-4 bg-danger-50 border border-danger-100 rounded-xl text-sm text-danger-600 flex gap-3 animate-fade-in">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  {apiError}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-graphite uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    {...register('password')}
                    className="input w-full rounded-xl pr-10 focus:ring-forest-ink transition-all shadow-sm"
                    placeholder="Create a strong password"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={showPass ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                    </svg>
                  </button>
                </div>
                {errors.password && <p className="text-xs text-danger-500 mt-1 animate-fade-in leading-relaxed">{errors.password.message}</p>}
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-graphite uppercase tracking-widest">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    className="input w-full rounded-xl pr-10 focus:ring-forest-ink transition-all shadow-sm"
                    placeholder="Confirm your new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d={showConfirmPass ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                    </svg>
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.confirmPassword.message}</p>}
              </div>

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full"
                size="lg"
              >
                Reset password
              </Button>
            </form>
          )}
        </div>
      </div>
      
      {/* Decorative gradient blob */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-mint-veil/50 blur-[120px] rounded-full mix-blend-multiply pointer-events-none z-0"></div>
    </div>
  );
};
