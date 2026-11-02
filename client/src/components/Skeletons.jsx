import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Shimmer({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-cream-200 via-cream-100 to-cream-200 rounded ${className}`}
    />
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-2">
        <Shimmer className="h-3 w-32" />
        <Shimmer className="h-7 w-64" />
        <Shimmer className="h-3.5 w-96 max-w-full" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-9 w-28 rounded-lg" />
        <Shimmer className="h-9 w-36 rounded-lg" />
      </div>
    </div>
  );
}

export function KpiCardsSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 bg-white border-cream-200 space-y-3">
          <div className="flex items-center justify-between">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-4 w-4 rounded-full" />
          </div>
          <Shimmer className="h-7 w-24" />
          <Shimmer className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function FilterBarSkeleton() {
  return (
    <div className="card p-4 bg-white border-cream-200 flex flex-col md:flex-row gap-3 justify-between">
      <Shimmer className="h-8 flex-1 max-w-md rounded-lg" />
      <div className="flex gap-2">
        <Shimmer className="h-8 w-28 rounded-lg" />
        <Shimmer className="h-8 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 7 }) {
  return (
    <div className="card overflow-hidden border-cream-200 bg-white">
      <div className="p-4 border-b border-cream-200 bg-cream-100/50 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Shimmer key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-cream-100 p-2 space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-4 py-3 px-2 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Shimmer key={cIdx} className={`h-4 flex-1 ${cIdx === 0 ? 'w-20' : ''}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <KpiCardsSkeleton count={6} />
      <FilterBarSkeleton />
      <TableSkeleton rows={7} cols={6} />
    </div>
  );
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error Caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex items-center justify-center p-6">
          <div className="card max-w-lg w-full bg-white p-8 text-center space-y-4 shadow-xl border-rose-200">
            <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-walnut-900">
                Application View Encountered an Error
              </h2>
              <p className="text-xs text-walnut-600 mt-1">
                The requested view could not be rendered smoothly. Your enterprise data is safe and untouched in MongoDB Atlas.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 rounded bg-cream-100 text-left font-mono text-[11px] text-rose-800 overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="btn-primary flex items-center gap-1.5 text-xs shadow-gold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Page</span>
              </button>
              <Link
                to="/dashboard"
                onClick={() => this.setState({ hasError: false, error: null })}
                className="btn-ghost flex items-center gap-1.5 text-xs border border-cream-300 text-walnut-800"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
