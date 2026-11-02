import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, usePerPerson, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate, isOverdue } from '../lib.js';
import { DataTablePagination, SortableHeader } from '../components/DataTablePagination.jsx';
import {
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  SlidersHorizontal,
  Plus,
  RefreshCw,
  List,
  LayoutGrid,
  MessageSquare,
  Paperclip,
  Check,
  X,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function ChecklistPage({ category = 'general', title = 'Checklist' }) {
  const { isStaff, user } = useAuth();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'cards'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // default to pending matching screenshot
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [daysWindow, setDaysWindow] = useState('30');

  // Pagination & Sorting state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState('plannedDate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [remarkTask, setRemarkTask] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofNote, setProofNote] = useState('');
  const [mdRemarkText, setMdRemarkText] = useState('');

  // New task form state
  const [newTask, setNewTask] = useState({
    description: '',
    assignedTo: '',
    plannedDate: new Date().toISOString().split('T')[0],
    frequency: 'daily',
    repeatUntil: '',
    proofRequired: category === 'account',
  });

  const { data: users = [] } = useUsers();
  
  // Calculate date filters
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
    const q = { category, page, limit, sortBy, sortOrder, ...dateParams };
    if (statusFilter) q.status = statusFilter;
    if (search) q.search = search;
    if (selectedPerson) q.assignedTo = selectedPerson;
    return q;
  }, [category, dateParams, statusFilter, search, selectedPerson, page, limit, sortBy, sortOrder]);

  const { data: listData, isLoading } = useList('checklists', queryParams);
  const { data: stats } = useStats('checklists', { category, ...dateParams });
  const { data: perPerson = [] } = usePerPerson('checklists', { category, ...dateParams });

  const { create, complete, updateRemark, remove } = useResourceMutation('checklists');

  const tasks = listData?.items || [];

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map((t) => t._id));
    }
  };

  const toggleSelectTask = (id) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Submit complete
  const handleCompleteSubmit = (e) => {
    e.preventDefault();
    if (!completingTask) return;
    complete.mutate(
      {
        id: completingTask._id,
        body: {
          remark: proofNote,
          proofUrl: proofFile ? `/uploads/${proofFile.name}` : undefined,
          documentName: proofFile ? proofFile.name : undefined,
        },
      },
      {
        onSuccess: () => {
          setCompletingTask(null);
          setProofFile(null);
          setProofNote('');
        },
      }
    );
  };

  // Submit MD remark
  const handleRemarkSubmit = (e) => {
    e.preventDefault();
    if (!remarkTask) return;
    updateRemark.mutate(
      { id: remarkTask._id, mdRemark: mdRemarkText },
      {
        onSuccess: () => {
          setRemarkTask(null);
          setMdRemarkText('');
        },
      }
    );
  };

  // Submit create new task
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    create.mutate(
      {
        ...newTask,
        category,
        repeatUntil: newTask.repeatUntil || undefined,
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setNewTask({
            description: '',
            assignedTo: '',
            plannedDate: new Date().toISOString().split('T')[0],
            frequency: 'daily',
            repeatUntil: '',
            proofRequired: category === 'account',
          });
        },
      }
    );
  };

  // Export to Excel / CSV
  const exportToExcel = () => {
    if (!tasks.length) return;
    const headers = ['Task ID', 'Assigned To', 'Department', 'Frequency', 'Task Description', 'Planned Date', 'Status', 'Actual Date', 'Proof Required', 'MD Remark'];
    const rows = tasks.map((t) => [
      t.taskCode,
      t.assignedTo?.name || '—',
      t.assignedTo?.department || '—',
      t.frequency,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      fmtDate(t.plannedDate),
      t.status,
      t.actualDate ? fmtDate(t.actualDate) : '',
      t.proofRequired ? 'Yes' : 'No',
      `"${(t.mdRemark || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setSearch('');
    setSelectedPerson('');
    setDaysWindow('30');
  };

  return (
    <div className="space-y-6">
      {/* Luxury Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-gold-500/25 bg-gradient-to-r from-[#fbf8f3] via-[#f7f1e7] to-[#ebdcc8] p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-3xl font-semibold tracking-wide text-walnut-950 sm:text-4xl">
                {title}
              </span>
              <span className="text-gold-600">✦</span>
              <span className="text-gold-500">◈</span>
              <span className="text-gold-600">✦</span>
            </div>
            <p className="mt-1 text-xs text-walnut-700">
              {category === 'account'
                ? 'Mandatory financial reconciliation, safe bullion verification & balance tallying.'
                : 'Operational routines, opening checklists, safe verification, and quality audit trails.'}
            </p>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Tasks */}
        <button
          onClick={() => setStatusFilter('')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === '' ? 'ring-2 ring-gold-500' : ''
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
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === 'pending' ? 'ring-2 ring-gold-500' : ''
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

        {/* Due Today */}
        <button
          onClick={() => setDaysWindow('1')}
          className="card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Due Today</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream-200 text-walnut-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">{stats?.dueToday ?? 0}</p>
        </button>

        {/* Completed */}
        <button
          onClick={() => setStatusFilter('completed')}
          className={`card flex flex-col justify-between p-4 text-left transition hover:border-gold-500/60 ${
            statusFilter === 'completed' ? 'ring-2 ring-leaf-500' : ''
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

        {/* Late Done */}
        <div className="card flex flex-col justify-between p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700">Late Done</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brick-500/20 text-brick-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-brick-600">{stats?.lateDone ?? 0}</p>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left search & filters */}
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedPerson('')}
              className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
            >
              <Filter className="h-3.5 w-3.5 text-gold-600" />
              Filters
              {statusFilter && <span className="ml-1 rounded-full bg-gold-500 px-1.5 text-[10px] text-white">1</span>}
            </button>

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
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold tracking-wide"
            >
              <Plus className="h-3.5 w-3.5" />
              + Add New Task
            </button>
          </div>
        </div>

        {/* Active Filter Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-cream-200/80 pt-2 text-xs">
          {statusFilter && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800">
              Status: <span className="capitalize">{statusFilter}</span>
              <button onClick={() => setStatusFilter('')} className="hover:text-brick-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedPerson && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold-800">
              Person: {users.find((u) => u._id === selectedPerson)?.name || 'Selected'}
              <button onClick={() => setSelectedPerson('')} className="hover:text-brick-600">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {(statusFilter || search || selectedPerson) && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-[11px] text-walnut-600 hover:text-walnut-950">
              <RefreshCw className="h-3 w-3" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Per Person Workload Rollup */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-cream-200 bg-[#281a0e] px-5 py-3 text-cream-50">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-semibold tracking-wide">
              Per Person ({perPerson.length})
            </span>
          </div>
          <div className="flex rounded-lg border border-walnut-700 bg-walnut-900 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 ${
                viewMode === 'list' ? 'bg-gold-500 font-semibold text-walnut-950' : 'text-cream-200 hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1 rounded px-2.5 py-1 ${
                viewMode === 'cards' ? 'bg-gold-500 font-semibold text-walnut-950' : 'text-cream-200 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
          </div>
        </div>

        {/* Per Person Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1f140a] text-cream-200/90 font-medium">
              <tr>
                <th className="px-5 py-3">Person</th>
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-3 py-3 text-center">Completed</th>
                <th className="px-3 py-3 text-center">Pending</th>
                <th className="px-3 py-3 text-center">Late Done</th>
                <th className="px-4 py-3 min-w-[120px]">Not Done %</th>
                <th className="px-4 py-3 min-w-[140px]">Completion %</th>
                <th className="px-4 py-3 min-w-[130px] pr-5">Late Compl. %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200 bg-white">
              {perPerson.map((row) => {
                const isCurrent = selectedPerson === row.user?._id;
                const initials = (row.user?.name || '')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                return (
                  <tr
                    key={row.user?._id}
                    onClick={() => setSelectedPerson(isCurrent ? '' : row.user?._id)}
                    className={`cursor-pointer transition hover:bg-cream-50 ${
                      isCurrent ? 'bg-gold-400/10 font-medium' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-bold text-walnut-900">
                          {initials}
                        </span>
                        <div>
                          <p className="font-semibold text-walnut-900">{row.user?.name}</p>
                          <p className="text-[11px] text-walnut-500">{row.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center font-bold text-walnut-900">{row.total}</td>
                    <td className="px-3 py-3.5 text-center font-bold text-leaf-600">{row.completed}</td>
                    <td className="px-3 py-3.5 text-center font-bold text-gold-700">{row.pending}</td>
                    <td className="px-3 py-3.5 text-center font-bold text-brick-600">{row.lateDone}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[11px] font-semibold text-walnut-700">{row.notDonePct}%</span>
                        <div className="h-1.5 w-full rounded-full bg-cream-200">
                          <div className="h-full rounded-full bg-walnut-500" style={{ width: `${row.notDonePct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[11px] font-semibold text-leaf-600">{row.completionPct}%</span>
                        <div className="h-1.5 w-full rounded-full bg-cream-200">
                          <div className="h-full rounded-full bg-leaf-500" style={{ width: `${row.completionPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 pr-5">
                      <div className="flex items-center gap-2">
                        <span className="w-8 text-[11px] font-semibold text-brick-600">{row.lateComplPct}%</span>
                        <div className="h-1.5 w-full rounded-full bg-cream-200">
                          <div className="h-full rounded-full bg-brick-500" style={{ width: `${row.lateComplPct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Tasks Table / Cards View */}
      {viewMode === 'list' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1f140a] text-cream-200/90 font-medium">
                <tr>
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTasks.length === tasks.length && tasks.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-cream-200 text-gold-500 focus:ring-gold-400"
                    />
                  </th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3">Department</th>
                  <SortableHeader
                    field="taskCode"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  >
                    Task Id
                  </SortableHeader>
                  <SortableHeader
                    field="frequency"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  >
                    Freq
                  </SortableHeader>
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
                    field="plannedDate"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                  >
                    Planned
                  </SortableHeader>
                  <SortableHeader
                    field="actualDate"
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    onSort={handleSort}
                    align="center"
                  >
                    Actual
                  </SortableHeader>
                  <th className="px-3 py-3 text-center">Proof Required</th>
                  <th className="px-3 py-3 text-center">DOCUMENT</th>
                  <th className="px-3 py-3 text-center pr-4">MD Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200 bg-white">
                {isLoading && (
                  <tr>
                    <td colSpan="11" className="p-8 text-center text-walnut-500">
                      Loading checklist tasks…
                    </td>
                  </tr>
                )}
                {!isLoading && tasks.length === 0 && (
                  <tr>
                    <td colSpan="11" className="p-8 text-center text-walnut-500">
                      No tasks found matching your filter criteria.
                    </td>
                  </tr>
                )}
                {tasks.map((task) => {
                  const overdue = isOverdue(task.plannedDate) && task.status !== 'completed';
                  const initials = (task.assignedTo?.name || '')
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isDone = task.status === 'completed';

                  return (
                    <tr key={task._id} className="transition hover:bg-cream-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedTasks.includes(task._id)}
                          onChange={() => toggleSelectTask(task._id)}
                          className="rounded border-cream-200 text-gold-500 focus:ring-gold-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cream-200 text-[10px] font-bold text-walnut-900">
                            {initials}
                          </span>
                          <span className="font-semibold text-walnut-900">{task.assignedTo?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-walnut-700">{task.assignedTo?.department || 'Accounts'}</td>
                      <td className="px-3 py-3 font-mono text-[11px] font-semibold text-gold-700">{task.taskCode}</td>
                      <td className="px-3 py-3">
                        <span className="rounded bg-cream-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-walnut-700">
                          {task.frequency}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-walnut-900">{task.description}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={overdue ? 'font-bold text-brick-600' : 'text-walnut-700'}>
                            {fmtDate(task.plannedDate)}
                          </span>
                          {overdue && (
                            <AlertTriangle className="h-3.5 w-3.5 text-brick-500" title="Past planned date" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 rounded bg-[#21170d] px-3 py-1 text-[11px] font-bold text-white shadow-sm">
                            <Check className="h-3 w-3 text-leaf-400" />
                            Done
                          </span>
                        ) : (
                          <button
                            onClick={() => setCompletingTask(task)}
                            className="btn inline-flex items-center gap-1 rounded bg-[#21170d] px-3 py-1 text-[11px] font-bold text-white shadow transition hover:bg-walnut-700 hover:text-gold-300"
                          >
                            Done
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {task.proofRequired ? (
                          <span className="rounded bg-brick-500/10 px-2 py-0.5 text-[10px] font-bold text-brick-600">
                            Yes
                          </span>
                        ) : (
                          <span className="text-[11px] text-walnut-400">No</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {task.proofUrl ? (
                          <a
                            href={task.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-gold-600 hover:underline"
                            title={task.documentName || 'View attached proof'}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            <span className="max-w-[70px] truncate text-[10px]">{task.documentName || 'Proof'}</span>
                          </a>
                        ) : (
                          <span className="text-walnut-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center pr-4">
                        <button
                          onClick={() => {
                            setRemarkTask(task);
                            setMdRemarkText(task.mdRemark || '');
                          }}
                          className={`rounded-full p-1.5 transition ${
                            task.mdRemark
                              ? 'bg-gold-500/20 text-gold-700 hover:bg-gold-500/30'
                              : 'text-walnut-400 hover:bg-cream-100 hover:text-walnut-700'
                          }`}
                          title={task.mdRemark ? `MD Remark: ${task.mdRemark}` : 'Add MD Remark'}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
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
      ) : (
        /* Cards View */
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => {
              const overdue = isOverdue(task.plannedDate) && task.status !== 'completed';
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task._id}
                  className="card flex flex-col justify-between p-4 shadow-sm transition hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-gold-700">{task.taskCode}</span>
                      <span className="rounded bg-cream-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-walnut-700">
                        {task.frequency}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-walnut-950">{task.description}</h3>
                    <div className="mt-3 flex items-center justify-between text-xs text-walnut-600">
                      <span>{task.assignedTo?.name}</span>
                      <span className={overdue ? 'font-bold text-brick-600' : ''}>
                        {fmtDate(task.plannedDate)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-cream-200/80 pt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRemarkTask(task);
                          setMdRemarkText(task.mdRemark || '');
                        }}
                        className="rounded p-1 text-walnut-400 hover:bg-cream-100 hover:text-walnut-900"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      {task.proofRequired && (
                        <span className="rounded bg-brick-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brick-600">
                          Proof Req
                        </span>
                      )}
                    </div>
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[#21170d] px-3 py-1 text-xs font-bold text-white">
                        <Check className="h-3 w-3 text-leaf-400" /> Done
                      </span>
                    ) : (
                      <button
                        onClick={() => setCompletingTask(task)}
                        className="btn inline-flex items-center gap-1 rounded bg-[#21170d] px-3 py-1 text-xs font-bold text-white hover:bg-walnut-700 hover:text-gold-300"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
      )}

      {/* Modal 1: Mark Done & Proof Upload */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Complete Task: {completingTask.taskCode}
              </h3>
              <button
                onClick={() => setCompletingTask(null)}
                className="rounded p-1 text-walnut-400 hover:text-walnut-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="mt-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-walnut-700">Task</p>
                <p className="text-sm font-medium text-walnut-900">{completingTask.description}</p>
              </div>

              {completingTask.proofRequired && (
                <div className="rounded-lg border border-gold-500/20 bg-cream-50 p-3">
                  <label className="label flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-gold-600" />
                    Upload Audit Proof / Voucher (Required)
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setProofFile(e.target.files?.[0])}
                    className="input py-1.5 text-xs"
                  />
                </div>
              )}

              <div>
                <label className="label">Completion Note / Remarks</label>
                <textarea
                  rows={3}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="e.g. Reconciled closing bullion weights and ledger."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={complete.isPending}
                  className="btn-primary text-xs"
                >
                  {complete.isPending ? 'Confirming…' : 'Mark as Done'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: MD Remark */}
      {remarkTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Managing Director Remark
              </h3>
              <button onClick={() => setRemarkTask(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRemarkSubmit} className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-walnut-500 font-mono">{remarkTask.taskCode}</p>
                <p className="text-sm font-semibold text-walnut-900">{remarkTask.description}</p>
              </div>

              <div>
                <label className="label">Executive Notes / Instructions</label>
                <textarea
                  rows={4}
                  required
                  value={mdRemarkText}
                  onChange={(e) => setMdRemarkText(e.target.value)}
                  placeholder="Enter executive remarks, feedback, or instructions..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRemarkTask(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={updateRemark.isPending} className="btn-primary text-xs">
                  {updateRemark.isPending ? 'Saving…' : 'Save Remark'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add New Task */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Schedule New {title}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label">Task Description</label>
                <textarea
                  rows={2}
                  required
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="e.g. Daily Safe Gold & Diamond Weigh-In"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Assign To</label>
                  <select
                    required
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
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
                  <label className="label">Frequency</label>
                  <select
                    value={newTask.frequency}
                    onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="once">Once</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Planned Date</label>
                  <input
                    type="date"
                    required
                    value={newTask.plannedDate}
                    onChange={(e) => setNewTask({ ...newTask, plannedDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Repeat Until (Optional)</label>
                  <input
                    type="date"
                    value={newTask.repeatUntil}
                    onChange={(e) => setNewTask({ ...newTask, repeatUntil: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-walnut-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTask.proofRequired}
                    onChange={(e) => setNewTask({ ...newTask, proofRequired: e.target.checked })}
                    className="rounded border-cream-200 text-gold-500 focus:ring-gold-400"
                  />
                  <span>Require Proof / Document Upload on Completion</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary text-xs">
                  {create.isPending ? 'Creating…' : 'Schedule Checklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

