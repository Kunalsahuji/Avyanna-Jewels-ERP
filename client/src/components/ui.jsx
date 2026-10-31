const TONES = {
  pending: 'bg-gold-400/20 text-gold-700', open: 'bg-gold-400/20 text-gold-700', in_progress: 'bg-gold-400/20 text-gold-700',
  approval_waiting: 'bg-sky-100 text-sky-800', review: 'bg-sky-100 text-sky-800',
  completed: 'bg-leaf-500/15 text-leaf-600', closed: 'bg-leaf-500/15 text-leaf-600',
  shifted: 'bg-cream-200 text-walnut-700',
  low: 'bg-cream-200 text-walnut-700', medium: 'bg-gold-400/20 text-gold-700',
  high: 'bg-orange-100 text-orange-800', critical: 'bg-brick-500/15 text-brick-500',
};

export const Badge = ({ value }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${TONES[value] || TONES.low}`}>
    {String(value).replace('_', ' ')}
  </span>
);

export const StatCard = ({ label, value, hint, tone }) => (
  <div className="card p-4">
    <p className="text-xs font-semibold text-walnut-700">{label}</p>
    <p className={`mt-1 font-display text-4xl font-semibold ${tone || ''}`}>{value ?? '—'}</p>
    {hint && <p className="mt-1 text-xs text-walnut-700/80">{hint}</p>}
  </div>
);

export const Avatar = ({ name, className = '' }) => (
  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-200 text-xs font-bold ${className}`}>
    {(name || '').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
  </span>
);

export const ProgressBar = ({ value, tone = 'bg-leaf-500' }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-cream-200">
    <div className={`h-full ${tone}`} style={{ width: `${value}%` }} />
  </div>
);

export function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-900/50 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="card w-full max-w-lg p-6" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
