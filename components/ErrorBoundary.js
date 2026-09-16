'use client';

import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import Logo from '@/components/Logo';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
          <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-[rgba(217,172,61,0.08)] blur-3xl" />
          <div className="pointer-events-none absolute -right-24 top-72 h-72 w-72 rounded-full bg-[rgba(217,172,61,0.06)] blur-3xl" />

          <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-linesoft bg-[radial-gradient(circle,rgba(247,221,143,0.12),rgba(0,0,0,0.2)_62%,transparent_70%)]">
            <Logo size={60} />
          </div>

          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(224,52,76,0.3)] bg-[rgba(224,52,76,0.1)]">
            <AlertTriangle size={26} className="text-brandred" />
          </div>

          <h1 className="mb-2 text-[20px] font-extrabold text-text1">Something went wrong</h1>
          <p className="mb-1 max-w-[300px] text-[13px] leading-relaxed text-text2">
            An unexpected error occurred. You can try again or head back to the home screen.
          </p>

          {this.state.error && (
            <p className="mb-6 max-w-[340px] break-all rounded-2xl border border-line bg-card px-4 py-3 text-[11px] text-brandred">
              {this.state.error.message || 'Unknown error'}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-full border border-linesoft bg-card px-5 py-3 text-[12px] font-bold text-text2 transition-all active:scale-95"
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = '/home')}
              className="flex items-center gap-2 rounded-full bg-gold-grad px-5 py-3 text-[12px] font-black text-[#171100] transition-all active:scale-95"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
