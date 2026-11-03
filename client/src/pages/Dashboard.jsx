import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useDashboard, useUsers, useResourceMutation } from '../api/hooks.js';
import { Avatar, ProgressBar, StatCard } from '../components/ui.jsx';
import { fmtDate, pct } from '../lib.js';
import {
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertTriangle,
  Plus,
  LayoutGrid,
  Search,
  MessageSquare,
  Check,
  RotateCcw,
  X,
  Package,
  ArrowRightLeft,
  Calendar,
  Gem,
  ExternalLink
} from 'lucide-react';

const RANGES = [
  [7, '7 days'],
  [30, '30 days'],
  [84, '12 weeks'],
];

const dayLabel = (iso) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short' });

export default function Dashboard() {
  const { isStaff, user } = useAuth();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [userId, setUserId] = useState('');
  const [decisionTab, setDecisionTab] = useState('approvals'); // 'approvals' | 'tickets'
  const [deliveryTab, setDeliveryTab] = useState('all'); // 'all' | 'delegation' | 'checklist'
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDept, setTeamDept] = useState('');

  // Active decision review modal state
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewNote, setReviewNote] = useState('');

  // Quick assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newDelegation, setNewDelegation] = useState({
    description: '',
    assignedTo: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    priority: 'medium',
  });

  const { data: users = [] } = useUsers();
  const { data, isLoading, isError, error } = useDashboard({
    days,
    ...(userId && { userId }),
  });

  const { act: actDelegation, create: createDelegation } = useResourceMutation('delegations');
  const { act: actTicket } = useResourceMutation('tickets');

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="font-display text-lg text-walnut-700">Loading Avyanna ERP Dashboard…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-6 text-brick-600">
        <p className="font-semibold">Unable to load dashboard</p>
        <p className="text-xs">{error.userMessage}</p>
      </div>
    );
  }

  const s = data.summary;
  const nd = data.needsDecision || { approvalsCount: 0, approvals: [], ticketReviewsCount: 0, ticketReviews: [] };

  // Filter team members
  const filteredTeam = (data.team || []).filter((t) => {
    const matchName = t.name.toLowerCase().includes(teamSearch.toLowerCase());
    const matchDept = !teamDept || t.department === teamDept;
    return matchName && matchDept;
  });

  const handleDecisionAction = (type, action) => {
    if (!reviewItem) return;
    if (type === 'delegation') {
      actDelegation.mutate(
        { id: reviewItem.id, action, body: { remark: reviewNote } },
        { onSuccess: () => { setReviewItem(null); setReviewNote(''); } }
      );
    } else {
      actTicket.mutate(
        { id: reviewItem.id, action: action === 'approve' ? 'close' : 'reopen', body: { remark: reviewNote } },
        { onSuccess: () => { setReviewItem(null); setReviewNote(''); } }
      );
    }
  };

  const handleCreateDelegation = (e) => {
    e.preventDefault();
    createDelegation.mutate(newDelegation, {
      onSuccess: () => {
        setShowAssignModal(false);
        setNewDelegation({
          description: '',
          assignedTo: '',
          dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          priority: 'medium',
        });
      },
    });
  };

  const completedPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
  const pendingPct = s.total > 0 ? 100 - completedPct : 0;

  return (
    <div className="space-y-6">
      {/* Luxury Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-gold-500/25 bg-gradient-to-r from-[#fbf8f3] via-[#f7f1e7] to-[#ebdcc8] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-4xl font-semibold tracking-wide text-walnut-950">
                Dashboard
              </span>
              <span className="text-gold-600">✦</span>
              <span className="text-gold-500">◈</span>
              <span className="text-gold-600">✦</span>
            </div>
            <p className="mt-1 text-xs text-walnut-700">
              Executive overview, compliance delivery, review queue, and workload distribution.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link to="/delegation" className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
              <LayoutGrid className="h-3.5 w-3.5 text-gold-600" />
              Delegation grid
            </Link>
            <button
              onClick={() => setShowAssignModal(true)}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign New Task
            </button>
          </div>
        </div>

        {/* Date Filter & Person Selector */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-walnut-800/10 pt-4 text-xs">
          <div className="flex items-center gap-1 rounded-full border border-cream-200 bg-white p-1 shadow-xs">
            {RANGES.map(([d, label]) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                  days === d
                    ? 'bg-[#21170d] text-gold-300 font-bold shadow-xs'
                    : 'text-walnut-700 hover:text-walnut-950 hover:bg-cream-100/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {isStaff && (
            <select
              aria-label="Filter by person"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="input !w-48 py-1.5 text-xs font-medium"
            >
              <option value="">Everyone</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.department})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total Card */}
        <div
          onClick={() => navigate('/delegation')}
          className="card cursor-pointer p-5 transition hover:border-gold-500/60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Total</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream-200 text-walnut-700">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-4xl font-bold text-walnut-950">{s.total}</p>
          <p className="mt-1 text-xs text-walnut-500">Due in the last {days} days</p>
        </div>

        {/* Completed Card */}
        <div
          onClick={() => navigate('/delegation?status=completed')}
          className="card cursor-pointer p-5 transition hover:border-gold-500/60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Completed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-leaf-500/20 text-leaf-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-leaf-600">{s.completed}</span>
            <span className="rounded bg-leaf-500/10 px-2 py-0.5 text-xs font-bold text-leaf-700">
              {completedPct}% of total
            </span>
          </div>
          <p className="mt-1 text-xs text-walnut-500">
            {s.onTime} on time · {s.late} late
          </p>
        </div>

        {/* Pending Card */}
        <div
          onClick={() => navigate('/delegation?status=pending')}
          className="card cursor-pointer p-5 transition hover:border-gold-500/60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Pending</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-400/20 text-gold-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold text-walnut-950">{s.pending}</span>
            {s.overdue > 0 && (
              <span className="rounded bg-brick-500/10 px-2 py-0.5 text-xs font-bold text-brick-600">
                {s.overdue} overdue
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-walnut-500">{s.dueToday} due today, not late yet</p>
        </div>
      </div>

      {/* Middle Row: Delivery Stacked Chart & Donut Chart */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Delivery Stacked Chart */}
        <section className="card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-walnut-950">Delivery</h2>
              <p className="text-xs text-walnut-600">
                Work due each day in the last {days} days — completed and pending.
              </p>
            </div>
            <div className="flex rounded-lg border border-cream-200 bg-cream-50 p-0.5 text-xs font-semibold">
              {['all', 'delegation', 'checklist'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDeliveryTab(tab)}
                  className={`rounded px-3 py-1 capitalize transition ${
                    deliveryTab === tab ? 'bg-white text-walnut-950 shadow-xs' : 'text-walnut-600 hover:text-walnut-900'
                  }`}
                >
                  {tab === 'all' ? 'All Work' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="font-bold text-walnut-900">Total {s.total}</span>
            <span className="flex items-center gap-1.5 font-semibold text-leaf-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-leaf-600" /> Completed {s.completed}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-gold-700">
              <span className="h-2.5 w-2.5 rounded-sm bg-gold-500" /> Pending {s.pending}
            </span>
          </div>

          {/* Stacked bar visualization */}
          <div className="mt-6 flex h-44 items-end gap-1.5 border-b border-cream-200 pb-2">
            {data.delivery.map((d) => {
              const totalDay = d.completed + d.pending;
              const max = Math.max(1, ...data.delivery.map((i) => i.completed + i.pending));
              const heightPct = (totalDay / max) * 100;
              const compPct = totalDay > 0 ? (d.completed / totalDay) * 100 : 0;
              const pendPct = totalDay > 0 ? (d.pending / totalDay) * 100 : 0;

              return (
                <div
                  key={d.date}
                  className="group relative flex flex-1 flex-col justify-end"
                  style={{ height: `${Math.max(heightPct, 6)}%` }}
                  title={`${d.date}: ${d.completed} done, ${d.pending} pending`}
                >
                  <div className="w-full rounded-t-sm bg-gold-400" style={{ height: `${pendPct}%` }} />
                  <div className="w-full bg-leaf-600" style={{ height: `${compPct}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-walnut-500 font-mono">
            <span>{data.delivery[0]?.date}</span>
            <span>{data.delivery[Math.floor(data.delivery.length / 2)]?.date}</span>
            <span>Today</span>
          </div>
        </section>

        {/* Donut Chart: Completed vs Pending */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-walnut-950">Completed vs Pending</h2>
            <p className="text-xs text-walnut-600">Every task planned in the last {days} days.</p>
          </div>

          {/* SVG Donut */}
          <div className="relative mx-auto my-6 flex h-44 w-44 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gold-400"
                strokeWidth="4"
                strokeDasharray={`${pendingPct}, 100`}
                strokeDashoffset={`-${completedPct}`}
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-leaf-600"
                strokeWidth="4"
                strokeDasharray={`${completedPct}, 100`}
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <p className="font-display text-3xl font-bold text-walnut-950">{s.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-walnut-500">Total</p>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-cream-200 pt-3 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-leaf-700">
                <span className="h-2 w-2 rounded-full bg-leaf-600" /> Completed
              </span>
              <span>{s.completed} <span className="text-walnut-500 font-normal">({completedPct}%)</span></span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-gold-700">
                <span className="h-2 w-2 rounded-full bg-gold-500" /> Pending
              </span>
              <span>{s.pending} <span className="text-walnut-500 font-normal">({pendingPct}%)</span></span>
            </div>
          </div>
        </section>
      </div>

      {/* Row: Needs Your Decision & Needs Attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Needs Your Decision */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-walnut-950">Needs Your Decision</h2>
            <p className="text-xs text-walnut-600">
              Work the doers have finished, waiting on a reviewer — oldest first.
            </p>

            {/* Tabs: Approvals vs Ticket Reviews */}
            <div className="mt-4 flex rounded-lg border border-cream-200 bg-cream-50 p-1 text-xs font-semibold">
              <button
                onClick={() => setDecisionTab('approvals')}
                className={`flex-1 rounded py-1.5 transition ${
                  decisionTab === 'approvals'
                    ? 'bg-white text-walnut-950 shadow-xs font-bold'
                    : 'text-walnut-600 hover:text-walnut-950'
                }`}
              >
                Approvals <span className="ml-1 rounded-full bg-cream-200 px-1.5 text-[10px]">{nd.approvalsCount}</span>
              </button>
              <button
                onClick={() => setDecisionTab('tickets')}
                className={`flex-1 rounded py-1.5 transition ${
                  decisionTab === 'tickets'
                    ? 'bg-white text-walnut-950 shadow-xs font-bold'
                    : 'text-walnut-600 hover:text-walnut-950'
                }`}
              >
                Ticket Reviews <span className="ml-1 rounded-full bg-cream-200 px-1.5 text-[10px]">{nd.ticketReviewsCount}</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex-1">
            {decisionTab === 'approvals' ? (
              nd.approvals.length === 0 ? (
                <p className="py-8 text-center text-xs text-walnut-400">Nothing is waiting for approval.</p>
              ) : (
                <ul className="divide-y divide-cream-200">
                  {nd.approvals.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => setReviewItem({ ...item, type: 'delegation' })}
                      className="flex cursor-pointer items-center justify-between py-3 transition hover:bg-cream-50"
                    >
                      <div>
                        <span className="font-mono text-[11px] font-bold text-gold-700">{item.code}</span>
                        <p className="text-xs font-semibold text-walnut-900">{item.title}</p>
                        <p className="text-[10px] text-walnut-500">Assigned To: {item.assignedTo} · By: {item.assignedBy}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-walnut-400" />
                    </li>
                  ))}
                </ul>
              )
            ) : nd.ticketReviews.length === 0 ? (
              <p className="py-8 text-center text-xs text-walnut-400">No ticket reviews pending.</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {nd.ticketReviews.map((item) => (
                  <li
                    key={item.id}
                    onClick={() => setReviewItem({ ...item, type: 'ticket' })}
                    className="flex cursor-pointer items-center justify-between py-3 transition hover:bg-cream-50"
                  >
                    <div>
                      <span className="font-mono text-[11px] font-bold text-gold-700">{item.code}</span>
                      <p className="text-xs font-semibold text-walnut-900">{item.title}</p>
                      <p className="text-[10px] text-walnut-500">Raised By: {item.raisedBy} · Tech: {item.assignedTo || 'Unassigned'}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-walnut-400" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Needs Attention (Overdue Radar) */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-walnut-950">Needs Attention</h2>
              <span className="rounded-full bg-brick-500/10 px-2.5 py-0.5 text-xs font-bold text-brick-600">
                {data.overdueTotal} items past due
              </span>
            </div>
            <p className="mt-1 text-xs text-walnut-600">
              Pending work past its due date, however old — oldest first.
            </p>
          </div>

          <div className="mt-4 flex-1">
            {data.needsAttention.length === 0 ? (
              <p className="py-8 text-center text-xs text-walnut-400">Nothing is overdue.</p>
            ) : (
              <ul className="divide-y divide-cream-200">
                {data.needsAttention.map((i, idx) => (
                  <li
                    key={idx}
                    onClick={() => navigate(i.path)}
                    className="group flex cursor-pointer items-center justify-between py-2.5 transition hover:bg-cream-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cream-200 text-walnut-700 group-hover:bg-gold-500/20 group-hover:text-gold-700">
                        {i.icon === 'ticket' ? (
                          <MessageSquare className="h-3.5 w-3.5" />
                        ) : i.icon === 'delegation' ? (
                          <LayoutGrid className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-walnut-900 group-hover:text-gold-700">
                          {i.title}
                        </p>
                        <p className="text-[10px] text-walnut-500">{i.module}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="border-b-2 border-brick-500 font-mono text-xs font-bold text-brick-600">
                        {i.daysLate} d late
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-walnut-400 group-hover:text-walnut-900" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-cream-200 pt-3 text-xs text-walnut-600">
            <span>{Math.min(data.needsAttention.length, 6)} of {data.overdueTotal} items · oldest first</span>
            <Link to="/tickets" className="font-semibold text-gold-700 hover:underline">
              Show All {data.overdueTotal} →
            </Link>
          </div>
        </section>
      </div>

      {/* Row: Work by Module & Checklist Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Work by Module (2 Cols) */}
        <section className="card p-6 lg:col-span-2">
          <h2 className="font-display text-2xl font-bold text-walnut-950">Work by Module</h2>
          <p className="text-xs text-walnut-600">
            Each module's work due in the last 30 days — total, completed and pending. Click a module for its detail.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-walnut-600 border-b border-cream-200">
                <tr>
                  <th className="pb-2">Module</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Completed</th>
                  <th className="pb-2 text-right pr-2">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {data.byModule.map((m) => {
                  const compPct = m.total > 0 ? (m.completed / m.total) * 100 : 0;
                  const pendPct = m.total > 0 ? (m.pending / m.total) * 100 : 0;
                  return (
                    <tr
                      key={m.module}
                      onClick={() => navigate(m.path)}
                      className="cursor-pointer transition hover:bg-cream-50"
                    >
                      <td className="py-2.5 font-semibold text-walnut-900 flex items-center gap-3">
                        <span className="w-36">{m.module}</span>
                        <div className="hidden sm:flex h-2 w-32 rounded-full overflow-hidden bg-cream-200">
                          <div className="bg-leaf-600" style={{ width: `${compPct}%` }} />
                          <div className="bg-gold-500" style={{ width: `${pendPct}%` }} />
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-bold text-walnut-900">{m.total}</td>
                      <td className="py-2.5 text-right font-bold text-leaf-600">{m.completed}</td>
                      <td className="py-2.5 text-right font-bold text-gold-700 pr-2">{m.pending}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Checklist Widget */}
        <section className="card p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-walnut-950">Checklist</h2>
            <p className="text-xs text-walnut-600">
              Its work due in the last 30 days, and what it has coming up.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2 border-b border-cream-200 pb-3 text-center">
              <div>
                <p className="font-display text-2xl font-bold text-walnut-900">320</p>
                <p className="text-[10px] text-walnut-500">Total in 30d</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-leaf-600">258</p>
                <p className="text-[10px] text-walnut-500">81% Done</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-gold-700">62</p>
                <p className="text-[10px] text-walnut-500">19% Pending</p>
              </div>
            </div>

            {/* Coming Up 7-Day bars */}
            <div className="mt-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-walnut-500">Coming Up</span>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center">
                {[
                  { day: 'Today', count: 16, active: true },
                  { day: 'Sat', count: 43, active: true },
                  { day: 'Sun', count: 0, active: false },
                  { day: 'Mon', count: 12, active: true },
                  { day: 'Tue', count: 14, active: true },
                  { day: 'Wed', count: 12, active: true },
                  { day: 'Thu', count: 10, active: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-walnut-900">{item.count}</span>
                    <div className="my-1 h-12 w-3 rounded-t-sm bg-cream-200 flex items-end">
                      <div
                        className={`w-full rounded-t-sm ${item.active ? 'bg-gold-600' : 'bg-transparent'}`}
                        style={{ height: `${Math.min(100, item.count * 2.3)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-walnut-500">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-cream-200 pt-3 text-xs">
            <span className="font-medium text-walnut-700">Checklist</span>
            <Link to="/checklist" className="font-semibold text-gold-700 hover:underline">
              Open Checklist →
            </Link>
          </div>
        </section>
      </div>

      {/* Row: Team Workload Table */}
      {isStaff && (
        <section className="card overflow-hidden">
          <div className="border-b border-cream-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold text-walnut-950">Team</h2>
                <p className="text-xs text-walnut-600">
                  Everyone with work due in the last 30 days — total, completed and pending. Open a row for that person's own dashboard.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search people…"
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="input py-1.5 pl-8 text-xs !w-44"
                  />
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-walnut-400" />
                </div>

                <select
                  value={teamDept}
                  onChange={(e) => setTeamDept(e.target.value)}
                  className="input py-1.5 text-xs !w-36"
                >
                  <option value="">All Departments</option>
                  <option value="Accounts">Accounts</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Production">Production</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1f140a] text-cream-200 font-medium">
                <tr>
                  <th className="px-5 py-3">Person</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-4 py-3 min-w-[200px]">Completed</th>
                  <th className="px-4 py-3 min-w-[200px]">Pending</th>
                  <th className="px-3 py-3 text-right pr-5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200 bg-white">
                {filteredTeam.map((t) => (
                  <tr key={t.userId} className="transition hover:bg-cream-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.name} />
                        <div>
                          <p className="font-semibold text-walnut-900">{t.name}</p>
                          <p className="text-[11px] text-walnut-500">{t.department} · {t.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold text-walnut-900">{t.total}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-leaf-600">{t.completed}</span>
                        <span className="text-[10px] text-walnut-500 font-semibold">{t.completionPct}%</span>
                        <div className="h-1.5 flex-1 rounded-full bg-cream-200 overflow-hidden">
                          <div className="h-full bg-leaf-600" style={{ width: `${t.completionPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gold-700">{t.pending}</span>
                        <span className="text-[10px] text-walnut-500 font-semibold">{t.pendingPct}%</span>
                        <div className="h-1.5 flex-1 rounded-full bg-cream-200 overflow-hidden">
                          <div className="h-full bg-gold-500" style={{ width: `${t.pendingPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right pr-5">
                      <button
                        onClick={() => setUserId(t.userId)}
                        className="font-semibold text-gold-700 hover:underline inline-flex items-center gap-1"
                      >
                        View &gt;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Row: Operations Summary Card */}
      <section className="card p-6">
        <h2 className="font-display text-2xl font-bold text-walnut-950">Operations</h2>
        <p className="text-xs text-walnut-600">
          Modules without due dates, shown as volumes rather than delivery rates.
        </p>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-cream-200">
          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-walnut-700">Stock Management</span>
            <p className="mt-2 font-display text-3xl font-bold text-walnut-950">1</p>
            <p className="text-[11px] text-walnut-500">parcels with a step still open</p>
          </div>

          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-walnut-700">Stock Received</span>
            <p className="mt-2 font-display text-3xl font-bold text-walnut-950">1</p>
            <p className="text-[11px] text-walnut-500">parcels in the last 30 days</p>
          </div>

          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-walnut-700">City Transfer</span>
            <p className="mt-2 font-display text-3xl font-bold text-walnut-950">47</p>
            <p className="text-[11px] text-walnut-500">transfers raised in the last 30 days</p>
          </div>

          <div className="px-3 py-2">
            <span className="text-xs font-semibold text-walnut-700">IMS</span>
            <p className="mt-2 font-display text-3xl font-bold text-walnut-950">0</p>
            <p className="text-[11px] text-walnut-500">reorders not yet received</p>
          </div>
        </div>
      </section>

      {/* Review & Decision Modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-gold-700">{reviewItem.code}</span>
                <h3 className="font-display text-lg font-bold text-walnut-950">
                  {reviewItem.type === 'delegation' ? 'Review Delegation' : 'Review Ticket Resolution'}
                </h3>
              </div>
              <button onClick={() => setReviewItem(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs">
                <p className="font-semibold text-walnut-900">{reviewItem.title}</p>
                <p className="mt-1 text-walnut-600">Due: {fmtDate(reviewItem.due)}</p>
              </div>

              <div>
                <label className="label">Reviewer Feedback / Confirmation Notes</label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Optional review notes..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => handleDecisionAction(reviewItem.type, 'send-back')}
                  className="btn inline-flex items-center gap-1 rounded bg-brick-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-brick-600"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Send Back
                </button>
                <button
                  type="button"
                  onClick={() => handleDecisionAction(reviewItem.type, 'approve')}
                  className="btn inline-flex items-center gap-1 rounded bg-leaf-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-leaf-700"
                >
                  <Check className="h-3.5 w-3.5" /> Approve & Sign Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign Task Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">Quick Assign Task</h3>
              <button onClick={() => setShowAssignModal(false)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDelegation} className="mt-4 space-y-3">
              <div>
                <label className="label">Task Description</label>
                <textarea
                  rows={2}
                  required
                  value={newDelegation.description}
                  onChange={(e) => setNewDelegation({ ...newDelegation, description: e.target.value })}
                  placeholder="Describe task..."
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assign To</label>
                  <select
                    required
                    value={newDelegation.assignedTo}
                    onChange={(e) => setNewDelegation({ ...newDelegation, assignedTo: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="">Select Employee</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDelegation.dueDate}
                    onChange={(e) => setNewDelegation({ ...newDelegation, dueDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
