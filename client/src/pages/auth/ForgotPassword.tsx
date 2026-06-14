import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../../validators';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

export const ForgotPasswordPage: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setApiError('');
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setIsSubmitted(true);
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Failed to send reset email');
    }
  };

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
          Reset password
        </h2>
        <p className="mt-2 text-center text-sm text-graphite">
          Or{' '}
          <Link to="/login" className="font-bold text-forest-ink hover:underline underline-offset-4 transition-all">
            return to login
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-fade-in relative z-10">
        <div className="bg-white py-10 px-8 shadow-xl shadow-forest-ink/5 rounded-[32px] border border-hairline-gray/30">
          {isSubmitted ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 bg-mint-veil text-forest-ink rounded-full flex items-center justify-center mx-auto mb-6 border border-forest-ink/10">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              </div>
              <h3 className="text-2xl font-bold font-display text-forest-ink mb-3">Check your email</h3>
              <p className="text-graphite mb-8 leading-relaxed">
                We've sent password reset instructions to <br/><span className="font-bold text-forest-ink">{getValues().email}</span>.
              </p>
              <Link to="/login" className="w-full">
                <Button variant="secondary" className="w-full" size="lg">
                  Return to login
                </Button>
              </Link>
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
                <label htmlFor="email" className="block text-xs font-bold text-graphite uppercase tracking-widest">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="input w-full rounded-xl focus:ring-forest-ink transition-all shadow-sm"
                  placeholder="Enter your registered email"
                />
                {errors.email && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.email.message}</p>}
              </div>

              <Button
                type="submit"
                isLoading={isSubmitting}
                className="w-full"
                size="lg"
              >
                Send reset link
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
