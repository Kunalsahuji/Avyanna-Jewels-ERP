import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate, isOverdue } from '../lib.js';
import { DataTablePagination, SortableHeader } from '../components/DataTablePagination.jsx';

function fmtDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
import {
  FileText,
  Clock,
  Hourglass,
  CheckCircle2,
  CalendarClock,
  Search,
  Filter,
  Download,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  MessageSquare,
  Calendar,
  Pencil,
  Trash2,
  Paperclip,
  AlertTriangle,
  Flame,
  Check,
  X,
  Send,
  RotateCcw
} from 'lucide-react';

export default function DelegationPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [daysWindow, setDaysWindow] = useState('30');

  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [shiftTask, setShiftTask] = useState(null);
  const [remarkTask, setRemarkTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);

  // Form states
  const [newDelegation, setNewDelegation] = useState({
    description: '',
    assignedTo: '',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
  });

  const [shiftForm, setShiftForm] = useState({
    newDate: '',
    reason: '',
  });

  const [remarkForm, setRemarkForm] = useState({
    type: 'Follow-Up (MD)',
    status: 'pending',
    text: '',
  });

  const { data: users = [] } = useUsers();

  // Date window filter calculation
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
    if (search) q.search = search;
    return q;
  }, [dateParams, statusFilter, priorityFilter, search, page, limit, sortBy, sortOrder]);

  const { data: listData, isLoading } = useList('delegations', queryParams);
  const { data: stats } = useStats('delegations', dateParams);

  const { create, act, update, remove } = useResourceMutation('delegations');

  const tasks = listData?.items || [];

  // Submit new delegation
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    create.mutate(newDelegation, {
      onSuccess: () => {
        setShowAssignModal(false);
        setNewDelegation({
          description: '',
          assignedTo: '',
          dueDate: new Date().toISOString().split('T')[0],
          priority: 'medium',
        });
      },
    });
  };

  // Submit date shift
  const handleShiftSubmit = (e) => {
    e.preventDefault();
    if (!shiftTask || !shiftForm.newDate || !shiftForm.reason) return;
    act.mutate(
      {
        id: shiftTask._id,
        action: 'shift',
        body: {
          newDate: shiftForm.newDate,
          reason: shiftForm.reason,
        },
      },
      {
        onSuccess: () => {
          setShiftTask(null);
          setShiftForm({ newDate: '', reason: '' });
        },
      }
    );
  };

  // Submit new remark & status from History & Activity modal (Matching Image 2 & 3)
  const handleSaveRemarkAndStatus = (e) => {
    if (e) e.preventDefault();
    if (!remarkTask) return;
    if (!remarkForm.text.trim()) {
      alert('Please enter a remark before saving changes.');
      return;
    }
    act.mutate(
      {
        id: remarkTask._id,
        action: 'remarks',
        body: {
          text: remarkForm.text.trim(),
          remarkType: remarkForm.type,
          status: remarkForm.status,
        },
      },
      {
        onSuccess: (res) => {
          setRemarkTask(null);
          setRemarkForm({ type: 'Follow-Up (MD)', status: 'pending', text: '' });
        },
      }
    );
  };

  // Chronological history events for the active task
  const historyEvents = useMemo(() => {
    if (!remarkTask) return [];
    const events = [];

    // 1. Task creation
    const createdDate = remarkTask.createdAt || remarkTask.dueDate;
    events.push({
      date: createdDate,
      author: remarkTask.assignedBy?.name || 'Devraj Sharma',
      badge: 'CREATED',
      description: `Task assigned to ${remarkTask.assignedTo?.name || 'Staff'}.`,
    });

    // 2. Reschedules / shifts
    if (remarkTask.shiftHistory?.length) {
      remarkTask.shiftHistory.forEach((s) => {
        events.push({
          date: s.createdAt,
          author: s.shiftedBy?.name || 'Staff',
          badge: 'SHIFTED',
          description: `Postponed to ${fmtDate(s.newDate)}. Reason: "${s.reason}"`,
        });
      });
    }

    // 3. Remarks & follow-ups
    if (remarkTask.remarks?.length) {
      remarkTask.remarks.forEach((r) => {
        events.push({
          date: r.createdAt,
          author: `${r.user?.name || 'Staff'}`,
          badge: r.type ? r.type.toUpperCase() : 'REMARK',
          description: r.text + (r.statusChange ? ` • (${r.statusChange})` : ''),
        });
      });
    }

    // 4. Completed status
    if (remarkTask.completedAt) {
      events.push({
        date: remarkTask.completedAt,
        author: 'System',
        badge: 'COMPLETED',
        description: 'Task marked as completed.',
      });
    }

    return events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [remarkTask]);

  // Submit task edit
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingTask) return;
    update.mutate(
      {
        id: editingTask._id,
        body: {
          description: editingTask.description,
          assignedTo: editingTask.assignedTo?._id || editingTask.assignedTo,
          dueDate: editingTask.dueDate,
          priority: editingTask.priority,
          status: editingTask.status,
        },
      },
      {
        onSuccess: () => setEditingTask(null),
      }
    );
  };

  // Delete task
  const handleDeleteConfirm = () => {
    if (!deletingTask) return;
    remove.mutate(deletingTask._id, {
      onSuccess: () => setDeletingTask(null),
    });
  };

  // Export to Excel / CSV
  const exportToExcel = () => {
    if (!tasks.length) return;
    const headers = ['Task ID', 'Assigned To', 'Assigned By', 'Task Description', 'Due Date', 'Status', 'Priority', 'Revisions', 'Remarks Count'];
    const rows = tasks.map((t) => [
      t.taskId,
      t.assignedTo?.name || '—',
      t.assignedBy?.name || '—',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      fmtDate(t.dueDate),
      t.status,
      t.priority,
      t.revisions ?? 0,
      t.remarks?.length ?? 0,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Delegations_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
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
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-leaf-500/30 bg-leaf-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-leaf-700">
            <Check className="h-3 w-3" />
            Completed
          </span>
        );
      case 'approval_waiting':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
            <Hourglass className="h-3 w-3" />
            Approval Waiting
          </span>
        );
      case 'shifted':
        return (
          <span className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
            <CalendarClock className="h-3 w-3" />
            Shifted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded border border-gold-500/40 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-800">
            Pending
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
                Delegation
              </span>
              <span className="text-gold-600">✦</span>
              <span className="text-gold-500">◈</span>
              <span className="text-gold-600">✦</span>
            </div>
            <p className="mt-1 text-xs text-walnut-700">
              Cross-department operational delegations, deadline tracking, revision controls, and approval management.
            </p>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Tasks */}
        <button
          onClick={() => setStatusFilter('')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${statusFilter === '' ? 'ring-2 ring-gold-500' : ''
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Total Tasks</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream-200 text-walnut-700">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">{stats?.total ?? 0}</p>
        </button>

        {/* Pending */}
        <button
          onClick={() => setStatusFilter('pending')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${statusFilter === 'pending' ? 'ring-2 ring-gold-500' : ''
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Pending</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-400/20 text-gold-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-walnut-950">{stats?.pending ?? 0}</span>
            {stats?.overdue > 0 && (
              <span className="rounded bg-brick-500/10 px-1.5 py-0.5 text-[11px] font-bold text-brick-600">
                {stats.overdue} overdue
              </span>
            )}
          </div>
        </button>

        {/* Approval Waiting */}
        <button
          onClick={() => setStatusFilter('approval_waiting')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${statusFilter === 'approval_waiting' ? 'ring-2 ring-sky-500' : ''
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Approval Waiting</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-sky-800">{stats?.approvalWaiting ?? 0}</p>
        </button>

        {/* Completed */}
        <button
          onClick={() => setStatusFilter('completed')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${statusFilter === 'completed' ? 'ring-2 ring-leaf-500' : ''
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Completed</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-leaf-500/20 text-leaf-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-leaf-600">{stats?.completed ?? 0}</p>
        </button>

        {/* Shifted */}
        <button
          onClick={() => setStatusFilter('shifted')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${statusFilter === 'shifted' ? 'ring-2 ring-rose-500' : ''
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Shifted</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-600">
              <CalendarClock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-600">{stats?.shifted ?? 0}</p>
        </button>
      </div>

      {/* Control & Filter Bar */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left search & filters */}
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search ID or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input py-1.5 pl-8 text-xs"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-walnut-400" />
            </div>

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

          {/* Right actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportToExcel} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium">
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </button>

            <button
              onClick={() => setShowAssignModal(true)}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide"
            >
              <Plus className="h-3.5 w-3.5" />
              Assign New Task
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        {(statusFilter || priorityFilter || search) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cream-200/80 pt-2 text-xs">
            {statusFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800">
                Status: <span className="capitalize">{statusFilter.replace('_', ' ')}</span>
                <button onClick={() => setStatusFilter('')} className="hover:text-brick-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {priorityFilter && (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800">
                Priority: <span className="capitalize">{priorityFilter}</span>
                <button onClick={() => setPriorityFilter('')} className="hover:text-brick-600">
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

      {/* Delegation Data Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1f140a] text-cream-200/90 font-medium">
              <tr>
                <SortableHeader
                  field="taskId"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Task ID
                </SortableHeader>
                <th className="px-4 py-3 font-semibold">Assigned To</th>
                <th className="px-4 py-3 font-semibold">Assigned By</th>
                <SortableHeader
                  field="description"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  className="min-w-[200px]"
                >
                  Task
                </SortableHeader>
                <SortableHeader
                  field="dueDate"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                >
                  Due
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
                <th className="px-2 py-3 font-semibold text-center">Rev.</th>
                <th className="px-3 py-3 font-semibold text-center">FILES</th>
                <th className="px-4 py-3 font-semibold text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 bg-white">
              {isLoading && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-walnut-500">
                    Loading delegated tasks…
                  </td>
                </tr>
              )}
              {!isLoading && tasks.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-walnut-500">
                    No delegations found matching your criteria.
                  </td>
                </tr>
              )}
              {tasks.map((task) => {
                const overdue = isOverdue(task.dueDate) && task.status !== 'completed';
                const toInitials = (task.assignedTo?.name || '')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                const byInitials = (task.assignedBy?.name || '')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                const isAssignee = user?._id === task.assignedTo?._id;
                const isAssignor = user?._id === task.assignedBy?._id;
                const canReview = isStaff || isAssignor;

                return (
                  <tr key={task._id} className="transition hover:bg-cream-50">
                    {/* Task ID */}
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-gold-700">
                      {task.taskId}
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-200 text-[10px] font-bold text-walnut-900">
                          {toInitials}
                        </span>
                        <span className="font-semibold text-walnut-900">{task.assignedTo?.name || '—'}</span>
                      </div>
                    </td>

                    {/* Assigned By */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-walnut-700 text-[10px] font-bold text-gold-300">
                          {byInitials}
                        </span>
                        <span className="text-walnut-700">{task.assignedBy?.name || '—'}</span>
                      </div>
                    </td>

                    {/* Task Description */}
                    <td className="px-4 py-3.5 font-medium text-walnut-900">
                      {task.description}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={overdue ? 'font-bold text-brick-600' : 'text-walnut-700'}>
                          {fmtDate(task.dueDate)}
                        </span>
                        {overdue && (
                          <AlertTriangle className="h-3.5 w-3.5 text-brick-500" title="Overdue task!" />
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-3.5 text-center">
                      {renderStatusBadge(task.status)}
                    </td>

                    {/* Priority Badge */}
                    <td className="px-3 py-3.5 text-center">
                      {renderPriorityBadge(task.priority)}
                    </td>

                    {/* Revisions */}
                    <td className="px-2 py-3.5 text-center font-bold text-walnut-700">
                      {task.revisions ?? 0}
                    </td>

                    {/* Files */}
                    <td className="px-3 py-3.5 text-center">
                      {task.files?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-gold-600" title={`${task.files.length} attached`}>
                          <Paperclip className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">{task.files.length}</span>
                        </span>
                      ) : (
                        <span className="text-walnut-300">—</span>
                      )}
                    </td>

                    {/* Action Icon Tray (Matching Screenshot) */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 1. Open History Icon (Matching Image 2 & 3) */}
                        <button
                          onClick={() => {
                            setRemarkTask(task);
                            setRemarkForm({
                              type: 'Follow-Up (MD)',
                              status: task.status || 'pending',
                              text: '',
                            });
                          }}
                          className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-walnut-900"
                          title="Open History"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>

                        {/* 2. Calendar / Shift Date Icon */}
                        <button
                          onClick={() => {
                            setShiftTask(task);
                            setShiftForm({
                              newDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
                              reason: '',
                            });
                          }}
                          className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-gold-700"
                          title="Reschedule / Shift Due Date"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>

                        {/* 3. Edit Icon */}
                        <button
                          onClick={() => setEditingTask(task)}
                          className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-walnut-900"
                          title="Edit Task"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* 4. Delete Icon (Admin / Assignor only) */}
                        <button
                          onClick={() => setDeletingTask(task)}
                          className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-brick-600"
                          title="Delete Task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        {/* Approval Action Buttons if in approval_waiting */}
                        {task.status === 'approval_waiting' && canReview && (
                          <div className="ml-2 flex items-center gap-1">
                            <button
                              onClick={() => act.mutate({ id: task._id, action: 'approve' })}
                              className="btn inline-flex items-center gap-1 rounded bg-leaf-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-leaf-700"
                              title="Approve Completion"
                            >
                              <Check className="h-3 w-3" /> Approve
                            </button>
                            <button
                              onClick={() => act.mutate({ id: task._id, action: 'send-back' })}
                              className="btn inline-flex items-center gap-1 rounded bg-brick-500 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-brick-600"
                              title="Send back for revisions"
                            >
                              <RotateCcw className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        )}

                        {/* Complete button if open and assigned to user */}
                        {task.status !== 'completed' && task.status !== 'approval_waiting' && isAssignee && (
                          <button
                            onClick={() => act.mutate({ id: task._id, action: 'complete' })}
                            className="ml-2 btn inline-flex items-center gap-1 rounded bg-[#21170d] px-2 py-0.5 text-[10px] font-bold text-white hover:bg-walnut-700"
                          >
                            Mark Done
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
            total={listData.total || tasks.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Modal 1: Assign New Task */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Assign New Delegation
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label">Task Description</label>
                <textarea
                  rows={3}
                  required
                  value={newDelegation.description}
                  onChange={(e) => setNewDelegation({ ...newDelegation, description: e.target.value })}
                  placeholder="e.g. purchase of diamonds princess cut and round cut"
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
                  <label className="label">Priority</label>
                  <select
                    value={newDelegation.priority}
                    onChange={(e) => setNewDelegation({ ...newDelegation, priority: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
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

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setShowAssignModal(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary text-xs">
                  {create.isPending ? 'Assigning…' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Shift Date / Reschedule */}
      {shiftTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Reschedule: {shiftTask.taskId}
              </h3>
              <button onClick={() => setShiftTask(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleShiftSubmit} className="mt-4 space-y-4">
              <div className="rounded-lg bg-cream-100 p-3 text-xs">
                <p className="font-semibold text-walnut-900">{shiftTask.description}</p>
                <p className="mt-1 text-walnut-600">
                  Current Due: <b>{fmtDate(shiftTask.dueDate)}</b> · Revisions: <b>{shiftTask.revisions}</b>
                </p>
              </div>

              <div>
                <label className="label">New Due Date</label>
                <input
                  type="date"
                  required
                  value={shiftForm.newDate}
                  onChange={(e) => setShiftForm({ ...shiftForm, newDate: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Mandatory Reason for Shifting</label>
                <textarea
                  rows={3}
                  required
                  value={shiftForm.reason}
                  onChange={(e) => setShiftForm({ ...shiftForm, reason: e.target.value })}
                  placeholder="e.g. Supplier delayed princess cut diamond dispatch by 3 days..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setShiftTask(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn-primary text-xs">
                  {act.isPending ? 'Rescheduling…' : 'Confirm Shift Date'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Open History (Matching Image 2 & 3) */}
      {remarkTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-white">
            {/* Dark Header (Matching Image 2) */}
            <div className="bg-[#241710] px-6 py-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold tracking-wide text-cream-100">
                      {remarkTask.taskId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                      <Clock className="h-3 w-3" />
                      {remarkTask.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-cream-200/90 font-normal">
                    {remarkTask.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemarkTask(null)}
                  className="rounded p-1 text-cream-300 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs text-walnut-800">
              {/* Key Value Details matching Image 2 */}
              <div className="divide-y divide-cream-200 border-b border-cream-200 pb-2">
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Assigned By</span>
                  <span className="font-semibold text-walnut-900">{remarkTask.assignedBy?.name || '—'}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Assigned To</span>
                  <span className="font-semibold text-walnut-900">{remarkTask.assignedTo?.name || '—'}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Priority</span>
                  <div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                      <AlertTriangle className="h-3 w-3" /> {remarkTask.priority || 'medium'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Planned Date</span>
                  <span className="font-semibold text-walnut-900">{fmtDateTime(remarkTask.dueDate)}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Revisions</span>
                  <span className="font-semibold text-walnut-900">{remarkTask.revisions ?? 0} of 2 used</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Proof</span>
                  <div>
                    <span className="inline-flex items-center rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                      {remarkTask.proofRequired === false ? 'OPTIONAL' : 'REQUIRED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ADD A REMARK Section matching Image 2 */}
              <div className="space-y-3 pt-1">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  ADD A REMARK
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label text-xs">
                      Remark Type <span className="text-brick-600">*</span>
                    </label>
                    <select
                      value={remarkForm.type}
                      onChange={(e) => setRemarkForm({ ...remarkForm, type: e.target.value })}
                      className="input text-xs"
                    >
                      <option value="Follow-Up (MD)">Follow-Up (MD)</option>
                      <option value="Employee Note">Employee Note</option>
                      <option value="Status Change">Status Change</option>
                      <option value="General Remark">General Remark</option>
                    </select>
                    <p className="mt-1 text-[10px] text-walnut-400">
                      Counts as a follow-up and can change the status.
                    </p>
                  </div>

                  <div>
                    <label className="label text-xs">
                      Status <span className="text-brick-600">*</span>
                    </label>
                    <select
                      value={remarkForm.status}
                      onChange={(e) => setRemarkForm({ ...remarkForm, status: e.target.value })}
                      className="input text-xs"
                    >
                      <option value="pending">Pending</option>
                      <option value="approval_waiting">Approval Waiting</option>
                      <option value="completed">Completed</option>
                      <option value="shifted">Shifted</option>
                    </select>
                    <p className="mt-1 text-[10px] text-walnut-400">
                      Choose Completed once the work is done.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="label text-xs">
                    Remark <span className="text-brick-600">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={remarkForm.text}
                    onChange={(e) => setRemarkForm({ ...remarkForm, text: e.target.value })}
                    placeholder="Your remark..."
                    className="input text-xs"
                  />
                </div>
              </div>

              {/* HISTORY Section matching Image 3 */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  HISTORY
                </h4>

                <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cream-300">
                  {historyEvents.map((evt, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-walnut-400 bg-white" />
                      <div className="text-xs">
                        <span className="font-medium text-walnut-600">
                          {fmtDateTime(evt.date)} • {evt.author}
                        </span>
                        <div className="mt-1 rounded border-l-2 border-walnut-400 bg-cream-50 px-3 py-1.5 text-walnut-800">
                          <span className="font-bold uppercase text-[10px] text-walnut-700 mr-1.5">
                            {evt.badge}
                          </span>
                          {evt.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pinned Bottom Footer matching Image 2 & 3 */}
            <div className="border-t border-cream-200 bg-[#fbf7f2] px-6 py-3 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setRemarkTask(null)}
                className="rounded-lg border border-cream-300 bg-white px-4 py-1.5 text-xs font-semibold text-walnut-700 hover:bg-cream-50 transition shadow-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveRemarkAndStatus}
                disabled={act.isPending}
                className="rounded-lg bg-[#4a2e22] px-5 py-1.5 text-xs font-semibold text-white hover:bg-[#382218] transition disabled:opacity-50 shadow-xs"
              >
                {act.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Edit Task */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Edit Delegation: {editingTask.taskId}
              </h3>
              <button onClick={() => setEditingTask(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label">Task Description</label>
                <textarea
                  rows={3}
                  required
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assign To</label>
                  <select
                    value={editingTask.assignedTo?._id || editingTask.assignedTo}
                    onChange={(e) => setEditingTask({ ...editingTask, assignedTo: e.target.value })}
                    className="input text-xs"
                  >
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Status</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                  className="input text-xs"
                >
                  <option value="pending">Pending</option>
                  <option value="approval_waiting">Approval Waiting</option>
                  <option value="completed">Completed</option>
                  <option value="shifted">Shifted</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setEditingTask(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={update.isPending} className="btn-primary text-xs">
                  {update.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Delete Confirmation */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-display text-xl font-bold text-walnut-950">Confirm Deletion</h3>
            <p className="mt-2 text-xs text-walnut-600">
              Are you sure you want to delete delegation <b>{deletingTask.taskId}</b> ({deletingTask.description})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setDeletingTask(null)} className="btn-ghost text-xs">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={remove.isPending} className="btn inline-flex items-center gap-1 rounded bg-brick-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brick-700">
                {remove.isPending ? 'Deleting…' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

