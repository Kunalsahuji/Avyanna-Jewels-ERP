import { Link } from 'react-router-dom';
import { Package, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ModulePlaceholder({ title, description, phase = 'Phase 2-4 Roadmap' }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold-500/30 bg-gradient-to-r from-walnut-900 to-walnut-800 p-8 text-cream-50 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              {phase}
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-wide text-cream-50">{title}</h1>
            <p className="mt-1 text-sm text-cream-100/70">{description}</p>
          </div>
          <Link to="/dashboard" className="btn inline-flex items-center gap-2 border border-gold-400/30 bg-walnut-700/80 px-4 py-2 text-sm text-gold-300 hover:bg-walnut-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="card p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cream-100 text-gold-600">
          <Package className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-walnut-900">{title} Integration</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-walnut-700">
          This module is part of the upcoming ERP phases. The foundational modules (<b>Checklist</b>, <b>Account Checklist</b>, <b>Delegation</b>, and <b>Help Tickets</b>) are currently active and operational.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/checklist" className="btn-primary text-xs">Open Checklist</Link>
          <Link to="/account-checklist" className="btn-ghost text-xs">Open Account Checklist</Link>
          <Link to="/delegation" className="btn-ghost text-xs">Open Delegation</Link>
        </div>
      </div>
    </div>
  );
}

