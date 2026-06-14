import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="card p-8 max-w-lg w-full text-center">
            <div className="w-16 h-16 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
              ⚠️
            </div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-slate-500 mb-8">
              We encountered an unexpected error while trying to display this page. Our team has been notified.
            </p>
            {this.state.error && (
              <div className="bg-slate-100 p-4 rounded-xl text-left overflow-x-auto text-xs font-mono text-slate-600 mb-8 border border-slate-200">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary w-full justify-center"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
