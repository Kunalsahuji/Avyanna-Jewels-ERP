import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { Badge, Modal, StatCard } from './ui.jsx';
import { isOverdue } from '../lib.js';

function CreateForm({ config, onDone }) {
  const { data: users = [] } = useUsers();
  const { create } = useResourceMutation(config.resource);
  const [values, setValues] = useState(() => Object.fromEntries(config.fields.map((f) => [f.name, f.default ?? ''])));
  const [error, setError] = useState('');
  const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));
 
  const submit = (e) => {
    e.preventDefault();
    const body = { ...(config.defaultQuery || {}), ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '')) };
    create.mutate(body, {
      onSuccess: onDone,
      onError: (err) => setError(err.response?.data?.details?.map((d) => `${d.path}: ${d.message}`).join(', ') || err.userMessage),
    });
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {config.fields.map((f) => (
        <div key={f.name}>
          <label className="label" htmlFor={f.name}>{f.label}</label>
          {f.type === 'textarea' ? (
            <textarea id={f.name} rows={3} className="input" required={f.required} value={values[f.name]} onChange={set(f.name)} />
          ) : f.type === 'select' || f.type === 'user' ? (
            <select id={f.name} className="input" required={f.required} value={values[f.name]} onChange={set(f.name)}>
              {f.type === 'user' && <option value="">Select a person</option>}
              {f.type === 'user'
                ? users.map((u) => <option key={u._id} value={u._id}>{u.name} · {u.department}</option>)
                : f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input id={f.name} type={f.type} className="input" required={f.required} value={values[f.name]} onChange={set(f.name)} />
          )}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-brick-500">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-ghost" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create'}</button>
      </div>
    </form>
  );
}

export default function ModulePage({ config }) {
  const { isStaff, user } = useAuth();
  const [filters, setFilters] = useState(() => ({ status: '', search: '', page: 1, ...(config.defaultQuery || {}) }));
  const [creating, setCreating] = useState(false);
  const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));

  const { data, isLoading, isError, error } = useList(config.resource, params);
  const { data: stats } = useStats(config.resource, config.defaultQuery);
  const { act, remove } = useResourceMutation(config.resource);

  const canCreate = !config.staffCreateOnly || isStaff;
  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const rowActions = (row) => {
    const waiting = row.status === config.approvalStatus;
    const open = row.status !== config.doneStatus && row.status !== 'shifted';
    const out = [];
    if (waiting && isStaff) {
      out.push(['approve', config.actions.approve], ['send-back', config.actions['send-back']]);
    } else if (open && !waiting) {
      out.push(['complete', config.actions.complete]);
    }
    return out;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-4xl font-semibold">{config.title}</h1>
        {canCreate && <button className="btn-primary" onClick={() => setCreating(true)}>Add {config.title === 'Help Tickets' ? 'ticket' : 'task'}</button>}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total" value={stats?.total} />
        <StatCard label="Pending" value={stats?.pending} hint={stats ? `${stats.overdue} overdue` : ''} tone="text-gold-600" />
        <StatCard label="Due today" value={stats?.dueToday} />
        <StatCard label="Completed" value={stats?.completed} tone="text-leaf-500" />
        <StatCard label="Overdue" value={stats?.overdue} tone="text-brick-500" />
      </div>

      <div className="flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search ID or description" aria-label="Search" value={filters.search} onChange={(e) => setFilter({ search: e.target.value })} />
        <select className="input max-w-[12rem]" aria-label="Status" value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {config.statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-walnut-800 text-cream-100">
            <tr>
              {config.columns.map((c) => <th key={c.label} className="px-4 py-3 font-semibold">{c.label}</th>)}
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td className="p-6" colSpan={config.columns.length + 2}>Loading…</td></tr>}
            {isError && <tr><td className="p-6 text-brick-500" colSpan={config.columns.length + 2}>{error.userMessage}</td></tr>}
            {data?.items.length === 0 && (
              <tr><td className="p-6 text-walnut-700" colSpan={config.columns.length + 2}>Nothing here yet. Add a {config.title === 'Help Tickets' ? 'ticket' : 'task'} to get started.</td></tr>
            )}
            {data?.items.map((row) => {
              const late = isOverdue(row[config.dueKey], row.status === config.doneStatus);
              return (
                <tr key={row._id} className={`border-t border-cream-200 ${late ? 'bg-brick-500/5' : ''}`}>
                  {config.columns.map((c) => (
                    <td key={c.label} className={`px-4 py-3 ${c.due && late ? 'font-semibold text-brick-500' : ''}`}>
                      {c.badge ? <Badge value={c.render(row)} /> : c.render(row)}
                    </td>
                  ))}
                  <td className="px-4 py-3"><Badge value={row.status} /></td>
                  <td className="space-x-2 px-4 py-3 text-right whitespace-nowrap">
                    {rowActions(row).map(([action, label]) => (
                      <button key={action} className="btn-ghost !px-3 !py-1" disabled={act.isPending} onClick={() => act.mutate({ id: row._id, action, body: {} })}>{label}</button>
                    ))}
                    {user.role === 'admin' && (
                      <button className="text-xs text-brick-500 hover:underline" onClick={() => window.confirm('Delete this item?') && remove.mutate(row._id)}>Delete</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span>Showing page {data.page} of {data.pages} · {data.total} items</span>
          <div className="flex gap-2">
            <button className="btn-ghost" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>Previous</button>
            <button className="btn-ghost" disabled={data.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</button>
          </div>
        </div>
      )}

      {creating && (
        <Modal title={`New ${config.title === 'Help Tickets' ? 'ticket' : 'task'}`} onClose={() => setCreating(false)}>
          <CreateForm config={config} onDone={() => setCreating(false)} />
        </Modal>
      )}
    </div>
  );
}
