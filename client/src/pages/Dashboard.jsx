import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard, useUsers } from '../api/hooks.js';
import { Avatar, ProgressBar, StatCard } from '../components/ui.jsx';
import { pct } from '../lib.js';

const RANGES = [[7, '7 days'], [30, '30 days'], [84, '12 weeks']];
const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' });

function DeliveryChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.completed + d.pending));
  return (
    <div className="flex h-48 items-end gap-1" role="img" aria-label="Work due per day, completed versus pending">
      {data.map((d) => (
        <div key={d.date} className="group flex flex-1 flex-col justify-end" title={`${d.date}: ${d.completed} done, ${d.pending} pending`}>
          <div className="bg-gold-500" style={{ height: `${(d.pending / max) * 100}%` }} />
          <div className="bg-leaf-500" style={{ height: `${(d.completed / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
}

function WeekAhead({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="grid grid-cols-7 gap-2">
      {data.map((d, i) => (
        <div key={d.date} className="text-center">
          <div className="flex h-24 items-end justify-center">
            <div className="w-full rounded-t bg-gold-400" style={{ height: `${Math.max((d.count / max) * 100, 4)}%`, opacity: 0.35 + (d.count / max) * 0.65 }} />
          </div>
          <p className="mt-1 text-sm font-semibold">{d.count}</p>
          <p className="text-xs text-walnut-700">{i === 0 ? 'Today' : dayLabel(d.date)}</p>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { isStaff } = useAuth();
  const [days, setDays] = useState(30);
  const [userId, setUserId] = useState('');
  const { data: users = [] } = useUsers();
  const { data, isLoading, isError, error } = useDashboard({ days, ...(userId && { userId }) });

  if (isLoading) return <p>Loading dashboard…</p>;
  if (isError) return <p className="text-brick-500">{error.userMessage}</p>;
  const { summary: s } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-5xl font-semibold">Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-full border border-cream-200 bg-white p-1">
            {RANGES.map(([d, label]) => (
              <button key={d} onClick={() => setDays(d)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${days === d ? 'bg-walnut-800 text-cream-50' : ''}`}>{label}</button>
            ))}
          </div>
          {isStaff && (
            <select className="input !w-48" aria-label="Filter by person" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Everyone</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={s.total} hint={`Due in the last ${days} days`} />
        <StatCard label="Completed" value={s.completed} tone="text-leaf-500" hint={`${pct(s.completed, s.total)}% of total · ${s.onTime} on time · ${s.late} late`} />
        <StatCard label="Pending" value={s.pending} tone="text-gold-600" hint={`${s.overdue} overdue · ${s.dueToday} due today`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Delivery</h2>
          <p className="mb-4 text-sm text-walnut-700">Work due each day, completed and pending.</p>
          <DeliveryChart data={data.delivery} />
        </section>
        <section className="card p-6">
          <h2 className="text-2xl font-semibold">Work by module</h2>
          <ul className="mt-4 space-y-4">
            {data.byModule.map((m) => (
              <li key={m.module}>
                <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{m.module}</span><span>{m.completed}/{m.total}</span></div>
                <ProgressBar value={pct(m.completed, m.total)} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="text-2xl font-semibold">Needs attention</h2>
          <p className="mb-3 text-sm text-walnut-700">{data.overdueTotal} items past due, oldest first.</p>
          {data.needsAttention.length === 0 && <p className="text-sm">Nothing is overdue.</p>}
          <ul className="divide-y divide-cream-200">
            {data.needsAttention.map((i, idx) => (
              <li key={idx} className="flex items-center justify-between py-3 text-sm">
                <div><p className="font-semibold">{i.title}</p><p className="text-xs text-walnut-700">{i.module}</p></div>
                <span className="font-semibold text-brick-500">{i.daysLate} d late</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-6">
          <h2 className="text-2xl font-semibold">Week ahead</h2>
          <p className="mb-4 text-sm text-walnut-700">Open items due today and the six days after.</p>
          <WeekAhead data={data.weekAhead} />
        </section>
      </div>

      {isStaff && (
        <section className="card overflow-hidden">
          <div className="p-6 pb-3"><h2 className="text-2xl font-semibold">Team</h2></div>
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100"><tr><th className="px-6 py-3">Person</th><th>Total</th><th>Completed</th><th className="pr-6">Pending</th></tr></thead>
            <tbody>
              {data.team.map((t) => (
                <tr key={t.userId} className="border-t border-cream-200">
                  <td className="px-6 py-3"><div className="flex items-center gap-3"><Avatar name={t.name} /><div><p className="font-semibold">{t.name}</p><p className="text-xs text-walnut-700">{t.department}</p></div></div></td>
                  <td className="font-semibold">{t.total}</td>
                  <td className="w-1/4"><span className="mr-2 font-semibold">{t.completed}</span><span className="text-xs text-walnut-700">{pct(t.completed, t.total)}%</span><ProgressBar value={pct(t.completed, t.total)} /></td>
                  <td className="w-1/4 pr-6"><span className="mr-2 font-semibold">{t.pending}</span><span className="text-xs text-walnut-700">{pct(t.pending, t.total)}%</span><ProgressBar value={pct(t.pending, t.total)} tone="bg-gold-500" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
