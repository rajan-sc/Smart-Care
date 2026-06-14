import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated, updateUser } = useAuth();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  
  // Prevent strict-mode double firing from hitting the API twice if it invalidates tokens
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided in the URL.');
      return;
    }

    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const verify = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        
        // If the user happens to be logged in right now, update their session instantly!
        if (isAuthenticated) {
          updateUser({ isVerified: true });
        }
        
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Failed to verify email. The link may have expired.');
      }
    };

    verify();
  }, [token, isAuthenticated, updateUser]);

  return (
    <div className="min-h-screen bg-linen-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-fade-in text-center">
        
        {/* Brand Header */}
        <Link to="/" className="inline-flex items-center justify-center gap-3 text-forest-ink font-display font-semibold text-3xl tracking-tight mb-10">
          <div className="w-12 h-12 rounded-2xl bg-forest-ink flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-linen-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          Smart Care
        </Link>
        
        {/* Card */}
        <div className="bg-white py-12 px-6 shadow-xl shadow-forest-ink/5 sm:rounded-[32px] sm:px-12 border border-hairline-gray/30">
          
          {status === 'loading' && (
            <div className="flex flex-col items-center animate-fade-in">
               <div className="relative mb-6">
                <div className="w-12 h-12 rounded-2xl bg-forest-ink flex items-center justify-center shadow-sm">
                  <svg className="w-6 h-6 text-linen-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <div className="absolute inset-0 rounded-2xl border-2 border-forest-ink/30 animate-ping" />
              </div>
              <h3 className="text-xl font-bold font-display text-forest-ink">Verifying Email...</h3>
              <p className="text-graphite mt-2 text-sm">Please wait while we confirm your secure token.</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="w-16 h-16 bg-mint-veil text-forest-ink rounded-full flex items-center justify-center mb-6 text-2xl border border-forest-ink/10">
                ✓
              </div>
              <h3 className="text-2xl font-display font-semibold text-forest-ink mb-3">Email Verified</h3>
              <p className="text-graphite mb-8 leading-relaxed">{message}</p>
              
              <Link to={isAuthenticated ? "/dashboard" : "/login"} className="w-full">
                <Button className="w-full" size="lg">
                  {isAuthenticated ? "Go to Dashboard" : "Go to Login"}
                </Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center animate-fade-in">
              <div className="w-16 h-16 bg-danger-50 text-danger-600 rounded-full flex items-center justify-center mb-6 text-2xl border border-danger-200">
                ✕
              </div>
              <h3 className="text-2xl font-display font-semibold text-forest-ink mb-3">Verification Failed</h3>
              <p className="text-graphite mb-8 leading-relaxed">{message}</p>
              
              <Link to="/login" className="w-full">
                <Button variant="secondary" className="w-full" size="lg">
                  Return to Login
                </Button>
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
