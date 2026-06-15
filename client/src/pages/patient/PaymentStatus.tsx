import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { AppShell } from '../../layouts/AppShell';

export const PaymentStatusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'error'>(() => orderId ? 'loading' : 'error');
  const [message, setMessage] = useState(() => orderId ? 'Verifying your payment...' : 'No order ID found.');

  useEffect(() => {
    if (!orderId) return;

    const verify = async () => {
      try {
        const res = await api.post('/payments/verify', { orderId });
        const { status: paymentStatus } = res.data.data;

        if (paymentStatus === 'SUCCESS') {
          setStatus('success');
          setMessage('Payment was successful! Your appointment is confirmed.');
        } else {
          setStatus('failed');
          setMessage('Payment failed or was cancelled. Please try again.');
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Error verifying payment. Please contact support.');
      }
    };

    verify();
  }, [orderId]);

  return (
    <AppShell>
      <div className="page-container py-20 flex justify-center items-center min-h-[70vh]">
        <div className="card p-10 max-w-lg w-full text-center animate-slide-up bg-linen-white border border-hairline-gray">
          
          <div className="relative z-10">
            {status === 'loading' && (
              <div className="flex flex-col items-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-mist-blue rounded-full animate-ping opacity-75"></div>
                  <div className="w-20 h-20 bg-linen-white border border-forest-ink rounded-full animate-spin"></div>
                </div>
                <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-3">Verifying Payment</h2>
                <p className="text-ease-body-sm text-charcoal">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="w-24 h-24 bg-mint-veil text-forest-ink rounded-full flex items-center justify-center mb-8 border border-forest-ink">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-3">Payment Successful!</h2>
                <p className="text-ease-body-sm text-charcoal mb-10 px-4">{message}</p>
                <Link to="/appointments" className="btn-primary w-full py-4 text-center">
                  View My Appointments
                </Link>
              </div>
            )}

            {(status === 'failed' || status === 'error') && (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="w-24 h-24 bg-danger-100 text-danger-700 rounded-full flex items-center justify-center mb-8 border border-danger-700">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-ease-subheading font-display tracking-tight text-forest-ink mb-3">
                  {status === 'failed' ? 'Payment Failed' : 'Payment Error'}
                </h2>
                <p className="text-ease-body-sm text-charcoal mb-10 px-4">{message}</p>
                
                <div className="w-full space-y-4">
                  <Link to="/appointments" className="btn-primary w-full py-4 text-center">
                    Return to Appointments
                  </Link>
                  <button 
                    onClick={() => navigate(-1)} 
                    className="w-full py-4 text-charcoal font-bold uppercase tracking-widest text-xs hover:bg-linen rounded-nav transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default PaymentStatusPage;
