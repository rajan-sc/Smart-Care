import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth, type Role } from '../../context/AuthContext';
import { loginSchema, type LoginInput } from '../../validators';

interface RoleConfig {
  label: string;
  description: string;
}

const roles: Record<Role, RoleConfig> = {
  PATIENT: {
    label: 'Patient',
    description: 'Manage your health, medications & appointments',
  },
  DOCTOR: {
    label: 'Doctor',
    description: 'Manage your queue, schedule & patient records',
  },
  CAREGIVER: {
    label: 'Caregiver',
    description: "Monitor patients you're responsible for",
  },
  ADMIN: {
    label: 'Admin',
    description: 'System administration and oversight',
  }
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>('PATIENT');
  const [apiError, setApiError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setApiError('');
    try {
      await login(data);
    } catch (err: any) {
      setApiError(err.response?.data?.error?.message || 'Incorrect email or password.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-linen-white">
      <div className="w-full max-w-sm animate-fade-in relative z-10">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-nav flex items-center justify-center flex-shrink-0 bg-forest-ink">
            <svg className="w-4 h-4 text-linen-white" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="font-bold tracking-tight text-forest-ink">
            Smart Care
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-display text-4xl font-semibold tracking-tight mb-2 text-forest-ink">
          Welcome back
        </h1>
        <p className="text-ease-body-sm mb-8 text-charcoal">
          Sign in to access your clinical dashboard.
        </p>

        {/* Role selector pills */}
        <div className="flex gap-1.5 mb-8 p-1.5 rounded-cards bg-linen border border-hairline-gray">
          {(['PATIENT', 'DOCTOR', 'CAREGIVER'] as Role[]).map((role) => {
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-nav text-xs font-semibold uppercase tracking-widest transition-all duration-300
                  ${isSelected ? 'bg-mist-blue text-forest-ink' : 'text-charcoal hover:bg-mist-blue/30'}`}
              >
                {roles[role].label}
              </button>
            )
          })}
        </div>

        {/* Context line */}
        <div className="mb-8 px-2">
          <p className="text-ease-caption text-charcoal">
            {roles[selectedRole].description}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {apiError && (
            <div className="px-4 py-3 rounded-cards text-sm animate-fade-in flex items-start gap-2 bg-danger-50 text-danger-700 border border-danger-100">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{apiError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="label" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              {...register('email')}
              placeholder="you@example.com"
              className="input w-full"
            />
            {errors.email && (
              <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="label" htmlFor="login-password">
                Password
              </label>
              <Link to="/forgot-password"
                className="text-ease-caption font-bold text-forest-ink hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                {...register('password')}
                placeholder="••••••••"
                className="input w-full pr-10"
              />
              <button type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-charcoal hover:bg-linen transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={showPass
                    ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  } />
                </svg>
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-danger-500 mt-1 animate-fade-in">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary disabled:opacity-50 mt-6 py-4"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign in securely'}
          </button>
        </form>

        <p className="mt-10 text-center text-sm font-medium text-charcoal transition-colors">
          New to Smart Care?{' '}
          <Link to="/register" className="font-bold text-forest-ink hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
