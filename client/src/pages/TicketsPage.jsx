import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate, isOverdue } from '../lib.js';
import { DataTablePagination, SortableHeader } from '../components/DataTablePagination.jsx';
import {
  LifeBuoy,
  Clock,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  MessageSquare,
  Paperclip,
  Check,
  X,
  RotateCcw,
  Send,
  UserCheck
} from 'lucide-react';

export default function TicketsPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [daysWindow, setDaysWindow] = useState('30');

  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals state
  const [showRaiseModal, setShowRaiseModal] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState(null);
  const [commentTicket, setCommentTicket] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitError, setSubmitError] = useState('');

  // Form state
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    department: 'IT',
    assignedTo: '',
    priority: 'medium',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
  });

  const { data: users = [] } = useUsers();

  const dateParams = useMemo(() => {
    if (daysWindow === 'all') return {};
    const d = Number(daysWindow) || 30;
    const from = new Date();
    from.setDate(from.getDate() - d);
    return { from: from.toISOString() };
  }, [daysWindow]);

  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  };

  const queryParams = useMemo(() => {
    const q = { page, limit, sortBy, sortOrder, ...dateParams };
    if (statusFilter) q.status = statusFilter;
    if (priorityFilter) q.priority = priorityFilter;
    if (departmentFilter) q.department = departmentFilter;
    if (search) q.search = search;
    return q;
  }, [dateParams, statusFilter, priorityFilter, departmentFilter, search, page, limit, sortBy, sortOrder]);

  const { data: listData, isLoading } = useList('tickets', queryParams);
  const { data: stats } = useStats('tickets', dateParams);

  const { create, act, remove } = useResourceMutation('tickets');

  const tickets = listData?.items || [];

  // Submit new ticket
  const handleRaiseSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    const payload = {
      title: newTicket.title.trim(),
      description: newTicket.description?.trim() || '',
      department: newTicket.department || 'IT',
      priority: newTicket.priority || 'medium',
      ...(newTicket.assignedTo ? { assignedTo: newTicket.assignedTo } : {}),
      ...(newTicket.dueDate ? { dueDate: newTicket.dueDate } : {}),
    };

    create.mutate(payload, {
      onSuccess: () => {
        setShowRaiseModal(false);
        setSubmitError('');
        setNewTicket({
          title: '',
          description: '',
          department: 'IT',
          assignedTo: '',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        });
      },
      onError: (err) => {
        const msg =
          err.response?.data?.details?.[0]?.message ||
          err.response?.data?.message ||
          err.userMessage ||
          'Failed to raise ticket';
        setSubmitError(msg);
      },
    });
  };

  // Submit resolve ticket
  const handleResolveSubmit = (e) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    act.mutate(
      {
        id: resolvingTicket._id,
        action: 'resolve',
        body: { resolutionNotes },
      },
      {
        onSuccess: () => {
          setResolvingTicket(null);
          setResolutionNotes('');
        },
      }
    );
  };

  // Submit comment
  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentTicket || !newCommentText.trim()) return;
    act.mutate(
      {
        id: commentTicket._id,
        action: 'comments',
        body: { text: newCommentText.trim() },
      },
      {
        onSuccess: () => setNewCommentText(''),
      }
    );
  };

  // Export to Excel / CSV
  const exportToExcel = () => {
    if (!tickets.length) return;
    const headers = ['Ticket No', 'Title', 'Department', 'Raised By', 'Assigned To', 'Due Date', 'Status', 'Priority', 'Resolution Notes'];
    const rows = tickets.map((t) => [
      t.ticketNo,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.department || '—',
      t.raisedBy?.name || '—',
      t.assignedTo?.name || '—',
      fmtDate(t.dueDate),
      t.status,
      t.priority,
      `"${(t.resolutionNotes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Help_Tickets_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setDepartmentFilter('');
    setSearch('');
    setDaysWindow('30');
  };

  const renderPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-brick-500/30 bg-brick-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brick-600">
            <Flame className="h-3 w-3" />
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-walnut-400/30 bg-cream-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-walnut-700">
            Low
          </span>
        );
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-leaf-500/30 bg-leaf-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-leaf-700">
            <Check className="h-3 w-3" />
            Closed
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            <Hourglass className="h-3 w-3" />
            Review
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-gold-500/40 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-800">
            Open
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Luxury Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gold-500/25 bg-gradient-to-r from-[#fbf8f3] via-[#f7f1e7] to-[#ebdcc8] p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-3xl font-semibold tracking-wide text-walnut-950 sm:text-4xl">
                Help Tickets
              </span>
              <span className="text-gold-600">✦</span>
              <span className="text-gold-500">◈</span>
              <span className="text-gold-600">✦</span>
            </div>
            <p className="mt-1 text-xs text-walnut-700">
              IT support, workshop equipment maintenance, network access issues, and operational service tickets.
            </p>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <button
          onClick={() => setStatusFilter('')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === '' ? 'ring-2 ring-gold-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Total Tickets</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream-200 text-walnut-700">
              <LifeBuoy className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">{stats?.total ?? 0}</p>
        </button>

        <button
          onClick={() => setStatusFilter('open')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === 'open' ? 'ring-2 ring-gold-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Open</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-400/20 text-gold-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-walnut-950">{stats?.open ?? 0}</span>
            {stats?.overdue > 0 && (
              <span className="rounded bg-brick-500/10 px-1.5 py-0.5 text-[11px] font-bold text-brick-600">
                {stats.overdue} overdue
              </span>
            )}
          </div>
        </button>

        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === 'in_progress' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">In Progress</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-700">{stats?.inProgress ?? 0}</p>
        </button>

        <button
          onClick={() => setStatusFilter('review')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === 'review' ? 'ring-2 ring-sky-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Review Waiting</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-sky-800">{stats?.review ?? 0}</p>
        </button>

        <button
          onClick={() => setStatusFilter('closed')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === 'closed' ? 'ring-2 ring-leaf-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Closed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-leaf-500/20 text-leaf-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-leaf-600">{stats?.closed ?? 0}</p>
        </button>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search ticket code, title or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input py-1.5 pl-8 text-xs"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-walnut-400" />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="input !w-32 py-1.5 text-xs"
            >
              <option value="">All Depts</option>
              <option value="IT">IT</option>
              <option value="Operations">Operations</option>
              <option value="Accounts">Accounts</option>
              <option value="Production">Production</option>
              <option value="HR">HR</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input !w-32 py-1.5 text-xs"
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={daysWindow}
              onChange={(e) => setDaysWindow(e.target.value)}
              className="input !w-36 py-1.5 text-xs"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportToExcel} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </button>

            <button
              onClick={() => setShowRaiseModal(true)}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide"
            >
              <Plus className="h-3.5 w-3.5" />
              + Raise New Ticket
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        {(statusFilter || priorityFilter || departmentFilter || search) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cream-200/80 pt-2 text-xs">
            {statusFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800">
                Status: <span className="capitalize">{statusFilter.replace('_', ' ')}</span>
                <button onClick={() => setStatusFilter('')} className="hover:text-brick-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {departmentFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800">
                Dept: {departmentFilter}
                <button onClick={() => setDepartmentFilter('')} className="hover:text-brick-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-walnut-600 hover:text-walnut-950">
              <RefreshCw className="h-3 w-3" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Tickets Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1f140a] text-cream-200/90 font-medium">
              <tr>
                <SortableHeader
                  field="ticketNo"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Ticket No
                </SortableHeader>
                <SortableHeader
                  field="title"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  className="min-w-[200px]"
                >
                  Title &amp; Description
                </SortableHeader>
                <SortableHeader
                  field="department"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Dept
                </SortableHeader>
                <th className="px-4 py-3 font-semibold">Raised By</th>
                <th className="px-4 py-3 font-semibold">Assigned To</th>
                <SortableHeader
                  field="dueDate"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Due &amp; SLA
                </SortableHeader>
                <SortableHeader
                  field="status"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                >
                  Status
                </SortableHeader>
                <SortableHeader
                  field="priority"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                >
                  Priority
                </SortableHeader>
                <th className="px-4 py-3 font-semibold text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 bg-white">
              {isLoading && (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-walnut-500">
                    Loading help tickets…
                  </td>
                </tr>
              )}
              {!isLoading && tickets.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-walnut-500">
                    No tickets found matching your criteria.
                  </td>
                </tr>
              )}
              {tickets.map((t) => {
                const overdue = isOverdue(t.dueDate) && t.status !== 'closed';
                const daysLate = Math.max(1, Math.floor((new Date() - new Date(t.dueDate)) / 86400000));
                const raisedInitials = (t.raisedBy?.name || '')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const assignedInitials = (t.assignedTo?.name || '')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isAssigned = user?._id === t.assignedTo?._id;
                const canReview = isStaff || user?._id === t.raisedBy?._id;

                return (
                  <tr key={t._id} className="transition hover:bg-cream-50">
                    {/* Ticket No */}
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-gold-700">
                      {t.ticketNo}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-walnut-900">{t.title}</p>
                      {t.description && <p className="text-[11px] text-walnut-500 truncate max-w-sm">{t.description}</p>}
                    </td>

                    {/* Department */}
                    <td className="px-3 py-3.5">
                      <span className="rounded bg-cream-100 px-2 py-0.5 text-[10px] font-semibold text-walnut-700">
                        {t.department || 'IT'}
                      </span>
                    </td>

                    {/* Raised By */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-200 text-[10px] font-bold text-walnut-900">
                          {raisedInitials}
                        </span>
                        <span className="font-medium text-walnut-800">{t.raisedBy?.name || 'Staff'}</span>
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3.5">
                      {t.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-walnut-700 text-[10px] font-bold text-gold-300">
                            {assignedInitials}
                          </span>
                          <span className="text-walnut-700">{t.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-walnut-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date & SLA */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={overdue ? 'font-bold text-brick-600' : 'text-walnut-700'}>
                          {fmtDate(t.dueDate)}
                        </span>
                        {overdue && (
                          <span className="rounded bg-brick-500/10 px-1 py-0.2 text-[10px] font-bold text-brick-600">
                            {daysLate} d late
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3.5 text-center">
                      {renderStatusBadge(t.status)}
                    </td>

                    {/* Priority Badge */}
                    <td className="px-3 py-3.5 text-center">
                      {renderPriorityBadge(t.priority)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Discussion modal button */}
                        <button
                          onClick={() => setCommentTicket(t)}
                          className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-walnut-900"
                          title="Discussion & Comments"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>

                        {/* If in review: Confirm Close or Reopen */}
                        {t.status === 'review' && canReview && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => act.mutate({ id: t._id, action: 'close' })}
                              className="btn inline-flex items-center gap-1 rounded bg-leaf-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-leaf-700"
                              title="Confirm resolution & close"
                            >
                              <Check className="h-3 w-3" /> Close
                            </button>
                            <button
                              onClick={() => act.mutate({ id: t._id, action: 'reopen' })}
                              className="btn inline-flex items-center gap-1 rounded bg-brick-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-brick-600"
                              title="Reopen for fixes"
                            >
                              <RotateCcw className="h-3 w-3" /> Reopen
                            </button>
                          </div>
                        )}

                        {/* If open or in progress: Resolve button */}
                        {t.status !== 'closed' && t.status !== 'review' && (
                          <button
                            onClick={() => setResolvingTicket(t)}
                            className="btn inline-flex items-center gap-1 rounded bg-[#21170d] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-walnut-700 hover:text-gold-300"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {listData && (
          <DataTablePagination
            page={listData.page || page}
            pages={listData.pages || 1}
            total={listData.total || tickets.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Modal 1: Raise New Ticket */}
      {showRaiseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Raise Service / Help Ticket
              </h3>
              <button
                onClick={() => {
                  setShowRaiseModal(false);
                  setSubmitError('');
                }}
                className="rounded p-1 text-walnut-400 hover:text-walnut-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseSubmit} className="mt-4 space-y-3">
              {submitError && (
                <div className="rounded-md bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                  {submitError}
                </div>
              )}
              <div>
                <label className="label">Issue Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weighing scale calibration error in production room"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Details & Steps to Reproduce</label>
                <textarea
                  rows={3}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Provide complete incident details..."
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Department</label>
                  <select
                    value={newTicket.department}
                    onChange={(e) => setNewTicket({ ...newTicket, department: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="IT">IT Support</option>
                    <option value="Operations">Operations</option>
                    <option value="Accounts">Accounts</option>
                    <option value="Production">Production Workshop</option>
                    <option value="HR">HR / Facilities</option>
                  </select>
                </div>

                <div>
                  <label className="label">Priority Level</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="critical">Critical (Immediate Halt)</option>
                    <option value="high">High (Major Impairment)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="low">Low (Cosmetic/Query)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assign Technician / Lead</label>
                  <select
                    value={newTicket.assignedTo}
                    onChange={(e) => setNewTicket({ ...newTicket, assignedTo: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="">Auto-Assign / Default</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Resolution SLA Deadline</label>
                  <input
                    type="date"
                    required
                    value={newTicket.dueDate}
                    onChange={(e) => setNewTicket({ ...newTicket, dueDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setShowRaiseModal(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary text-xs">
                  {create.isPending ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Resolve Ticket */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Resolve Ticket: {resolvingTicket.ticketNo}
              </h3>
              <button onClick={() => setResolvingTicket(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-2.5 text-xs">
                <p className="font-semibold text-walnut-900">{resolvingTicket.title}</p>
              </div>

              <div>
                <label className="label">Resolution Summary & Fix Notes</label>
                <textarea
                  rows={4}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain actions taken to resolve this problem..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setResolvingTicket(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn-primary text-xs">
                  {act.isPending ? 'Submitting…' : 'Submit for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Comments & Discussion */}
      {commentTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-gold-700">{commentTicket.ticketNo}</span>
                <h3 className="font-display text-lg font-bold text-walnut-950">{commentTicket.title}</h3>
              </div>
              <button onClick={() => setCommentTicket(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {commentTicket.comments?.length > 0 ? (
                commentTicket.comments.map((c, idx) => (
                  <div key={idx} className="rounded-lg bg-cream-100 p-2.5 text-xs">
                    <div className="flex justify-between font-semibold text-walnut-900">
                      <span>{c.user?.name || 'Staff'}</span>
                      <span className="text-[10px] text-walnut-500">{new Date(c.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="mt-1 text-walnut-700">{c.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-walnut-400 py-6">No comments recorded on this ticket yet.</p>
              )}
            </div>

            <form onSubmit={handleCommentSubmit} className="pt-3 border-t border-cream-200 flex gap-2">
              <input
                type="text"
                required
                placeholder="Type diagnostic update or question..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="input py-1.5 text-xs flex-1"
              />
              <button type="submit" disabled={act.isPending} className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                <Send className="h-3.5 w-3.5" />
                Reply
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

