import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { registerSchema, type RegisterInput } from '../../validators';

export const RegisterPage: React.FC = () => {
  const { register: authRegister } = useAuth();
  const [apiError, setApiError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'PATIENT',
      phone: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setApiError('');
    try {
      await authRegister(data);
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Registration failed. Please check your details and try again.');
    }
  };

  return (
    <div className="min-h-screen flex bg-linen-white">
      {/* Left side: Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24 py-12 z-10 relative bg-linen-white border-r border-hairline-gray">
        <div className="mx-auto w-full max-w-md animate-fade-in">
          
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-cards bg-mist-blue flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-forest-ink" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-xl font-bold text-forest-ink tracking-tight">Smart Care</span>
          </div>

          <h2 className="text-ease-display font-display font-semibold text-forest-ink mb-2 tracking-tight">Create an account</h2>
          <p className="text-ease-body-sm text-charcoal mb-8">Join Smart Care to manage your clinical journey seamlessly.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-ease-21">
            {apiError && (
              <div className="p-ease-14 bg-danger-50 border border-danger-100 rounded-cards text-ease-body-sm text-danger-700 animate-fade-in flex gap-3">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {apiError}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-ease-14">
              <div className="space-y-1.5">
                <label className="label" htmlFor="firstName">First name</label>
                <input id="firstName" type="text" {...register('firstName')} className="input w-full" placeholder="Jane" />
                {errors.firstName && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="label" htmlFor="lastName">Last name</label>
                <input id="lastName" type="text" {...register('lastName')} className="input w-full" placeholder="Doe" />
                {errors.lastName && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" {...register('email')} className="input w-full" placeholder="jane@example.com" />
              {errors.email && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPass ? 'text' : 'password'} {...register('password')} className="input w-full pr-10" placeholder="8+ chars, A-Z, a-z, 0-9, !@#" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-charcoal hover:bg-linen rounded-nav transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={showPass ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                  </svg>
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger-500 mt-1 animate-fade-in leading-relaxed">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-ease-14">
              <div className="space-y-1.5">
                <label className="label" htmlFor="role">I am a...</label>
                <select id="role" {...register('role')} className="input w-full cursor-pointer">
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="CAREGIVER">Caregiver</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="label" htmlFor="phone">Phone (optional)</label>
                <input id="phone" type="tel" {...register('phone')} className="input w-full font-mono" placeholder="9999999999" />
                {errors.phone && <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.phone.message}</p>}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full btn-primary disabled:opacity-50 mt-ease-21 py-4">
              {isSubmitting ? 'Creating...' : 'Create account'}
            </button>
          </form>

          <p className="mt-10 text-center text-ease-body-sm text-charcoal">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-forest-ink hover:underline">Sign in securely</Link>
          </p>
        </div>
      </div>

      {/* Right side: Image/Graphic */}
      <div className="hidden lg:flex flex-1 relative bg-mist-blue overflow-hidden items-center justify-center border-l border-hairline-gray">
        
        {/* Subtle dot pattern instead of mesh gradients */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#0f3e17 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="relative z-10 p-12 text-center max-w-lg">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-nav bg-linen border border-forest-ink text-forest-ink text-ease-caption font-bold uppercase tracking-widest mb-8">
            Clinical Calm
          </div>
          <h3 className="text-ease-display font-display font-semibold text-forest-ink mb-6 leading-tight tracking-tight">Healthcare that works for people.</h3>
          <p className="text-ease-body text-charcoal font-medium leading-relaxed">Connect with your doctors, track your vitals, and manage your health seamlessly with our state-of-the-art platform.</p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
