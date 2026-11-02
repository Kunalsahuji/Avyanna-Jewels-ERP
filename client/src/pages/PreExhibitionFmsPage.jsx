import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate, isOverdue } from '../lib.js';
import {
  CalendarCheck,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck2,
  FileSpreadsheet,
  BadgeAlert,
  Building2,
  Sparkles,
  Ticket,
  Send,
  Plane,
  Stamp,
  Layers,
  CheckSquare,
  Square,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function fmtDateTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

const CATEGORY_CONFIG = {
  booth_design: { label: 'Booth & Lighting Design', icon: Building2, tone: 'text-amber-800 bg-amber-500/15 border-amber-500/30' },
  insurance_security: { label: 'Insurance & Armored Escort', icon: ShieldCheck, tone: 'text-sky-800 bg-sky-500/15 border-sky-500/30' },
  vip_invites: { label: 'VIP Previews & Royal Salons', icon: Ticket, tone: 'text-purple-800 bg-purple-500/15 border-purple-500/30' },
  catalogue_marketing: { label: 'Lookbook & NFC Marketing', icon: Sparkles, tone: 'text-gold-800 bg-gold-500/15 border-gold-500/30' },
  travel_logistics: { label: 'Team Flights & Trunk Hotel', icon: Plane, tone: 'text-emerald-800 bg-emerald-500/15 border-emerald-500/30' },
  regulatory_carnet: { label: 'ATA Carnet & Customs Bond', icon: Stamp, tone: 'text-rose-800 bg-rose-500/15 border-rose-500/30' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical Gate', bg: 'bg-rose-500/15 text-rose-800 border-rose-500/30' },
  high: { label: 'High Priority', bg: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
  medium: { label: 'Standard', bg: 'bg-gold-500/15 text-gold-800 border-gold-500/30' },
  low: { label: 'Low', bg: 'bg-cream-200 text-walnut-700 border-cream-300' },
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: 'bg-cream-200 text-walnut-700 border-cream-300' },
  in_progress: { label: 'In Progress', bg: 'bg-sky-500/15 text-sky-800 border-sky-500/30' },
  review_required: { label: 'Needs Sign-Off', bg: 'bg-amber-500/20 text-amber-900 border-amber-500/40' },
  completed: { label: 'Verified & Closed', bg: 'bg-leaf-500/15 text-leaf-800 border-leaf-500/30' },
};

export default function PreExhibitionFmsPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [signOffModalItem, setSignOffModalItem] = useState(null);
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Forms
  const [newTask, setNewTask] = useState({
    exhibitionTitle: 'IIJS Signature 2026 Mumbai',
    category: 'booth_design',
    title: '',
    description: '',
    milestoneDueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
    priority: 'high',
    assignedTo: '',
    proofDocument: '',
    checklistItemsText: 'Step 1: Initial drafting\nStep 2: Department verification\nStep 3: Final seal',
  });

  const [signOffForm, setSignOffForm] = useState({
    remarks: '',
    proofDocument: '',
  });

  const { data: users = [] } = useUsers();
  const { data: exhibitionsData } = useList('exhibition');
  const exhibitions = exhibitionsData?.items || [];

  const queryParams = useMemo(() => {
    const q = {};
    if (categoryFilter) q.category = categoryFilter;
    if (priorityFilter) q.priority = priorityFilter;
    if (statusFilter) q.status = statusFilter;
    if (search) q.search = search;
    return q;
  }, [categoryFilter, priorityFilter, statusFilter, search]);

  const { data: listData, isLoading } = useList('pre-exhibition', queryParams);
  const { data: stats } = useStats('pre-exhibition', queryParams);
  const { create, act } = useResourceMutation('pre-exhibition');

  const tasks = listData?.items || [];

  // Submit Handlers
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const items = newTask.checklistItemsText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean)
      .map((itemText) => ({ itemText, isDone: false }));

    const selEx = exhibitions.find((ex) => ex.title === newTask.exhibitionTitle);

    create.mutate(
      {
        exhibitionId: selEx?._id,
        exhibitionTitle: newTask.exhibitionTitle,
        category: newTask.category,
        title: newTask.title,
        description: newTask.description,
        milestoneDueDate: newTask.milestoneDueDate,
        priority: newTask.priority,
        assignedTo: newTask.assignedTo || user?._id || user?.id,
        proofDocument: newTask.proofDocument,
        checklistItems: items,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewTask({
            exhibitionTitle: 'IIJS Signature 2026 Mumbai',
            category: 'booth_design',
            title: '',
            description: '',
            milestoneDueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
            priority: 'high',
            assignedTo: '',
            proofDocument: '',
            checklistItemsText: 'Step 1: Initial drafting\nStep 2: Department verification\nStep 3: Final seal',
          });
        },
      }
    );
  };

  const handleToggleSubItem = (taskId, itemIndex, currentIsDone) => {
    act.mutate({
      id: taskId,
      action: 'toggle-item',
      body: {
        itemIndex,
        isDone: !currentIsDone,
      },
    });
  };

  const handleSignOffSubmit = (e) => {
    e.preventDefault();
    if (!signOffModalItem) return;
    act.mutate(
      {
        id: signOffModalItem._id,
        action: 'sign-off',
        body: signOffForm,
      },
      {
        onSuccess: () => {
          setSignOffModalItem(null);
          setSignOffForm({ remarks: '', proofDocument: '' });
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!tasks.length) return;
    const headers = [
      'Task Code',
      'Exhibition',
      'Category',
      'Milestone Title',
      'Due Date',
      'Priority',
      'Status',
      'Assigned To',
      'Proof Document',
    ];
    const rows = tasks.map((t) => [
      t.taskCode,
      `"${t.exhibitionTitle}"`,
      t.category,
      `"${t.title}"`,
      t.milestoneDueDate ? t.milestoneDueDate.slice(0, 10) : '',
      t.priority,
      t.status,
      `"${t.assignedTo?.name || 'Unassigned'}"`,
      `"${t.proofDocument || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pre_Exhibition_Tasks_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Luxury Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="mb-1 text-xs font-medium text-walnut-500">
            <span>Tvisha ERP</span>
            <span className="mx-2">›</span>
            <span className="text-gold-700 font-semibold">Pre-Exhibition FMS</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut-900 sm:text-3xl">
              Pre-Exhibition FMS & Milestone Gates
            </h1>
            <span className="inline-flex items-center rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-gold-800 border border-gold-500/20">
              Event Readiness
            </span>
          </div>
          <p className="mt-1 text-xs text-walnut-600">
            Booth architecture, ATA carnet customs clearances, Lloyds transit insurance, VIP invitations & countdown gates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-ghost flex items-center gap-1.5 text-xs font-medium text-walnut-700 border border-cream-300 bg-white shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          {isStaff && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs font-semibold shadow-gold"
            >
              <Plus className="h-4 w-4" />
              <span>Add Milestone Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-gold-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gold-900 uppercase tracking-wider">Readiness Score</span>
            <CalendarCheck className="h-4 w-4 text-gold-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-gold-900">
            {stats?.readinessScore || 0}%
          </div>
          <div className="mt-1 text-[11px] text-gold-700">Pre-show milestone gates</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-rose-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Critical Gates</span>
            <BadgeAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-rose-900">
            {stats?.criticalPending || 0}
          </div>
          <div className="mt-1 text-[11px] text-rose-700">High-risk pending gates</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-leaf-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-leaf-800 uppercase tracking-wider">Signed Off</span>
            <CheckCircle2 className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-leaf-900">
            {stats?.completed || 0}
          </div>
          <div className="mt-1 text-[11px] text-leaf-700">Manager verified milestones</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-sky-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider">In Progress</span>
            <Clock className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-sky-900">
            {stats?.inProgress || 0}
          </div>
          <div className="mt-1 text-[11px] text-sky-700">Active checklist items</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-purple-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">VIP Previews</span>
            <Ticket className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-purple-900">
            18 / 40
          </div>
          <div className="mt-1 text-[11px] text-purple-700">Royal salons confirmed</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-amber-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">ATA Carnet</span>
            <Stamp className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-lg font-bold text-amber-900">
            FICCI Bonded
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Export customs verified</div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut-400" />
            <input
              type="text"
              placeholder="Search milestone task, exhibition, category or document..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full bg-cream-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>

            <div className="flex rounded-md border border-cream-300 p-0.5 bg-cream-100/50">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'cards'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                Milestone Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'table'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                Table View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <div className="col-span-full card p-12 text-center text-xs text-walnut-500 bg-white">
              Loading pre-exhibition milestones...
            </div>
          ) : tasks.length === 0 ? (
            <div className="col-span-full card p-12 text-center text-xs text-walnut-500 bg-white">
              No milestone tasks found.
            </div>
          ) : (
            tasks.map((task) => {
              const catCfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.booth_design;
              const priCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
              const statCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
              const Icon = catCfg.icon;

              const totalSub = task.checklistItems?.length || 0;
              const doneSub = task.checklistItems?.filter((i) => i.isDone).length || 0;
              const subPct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
              const overdue = task.status !== 'completed' && isOverdue(task.milestoneDueDate);

              return (
                <div
                  key={task._id}
                  className="card p-5 bg-white border-cream-200 shadow-sm space-y-4 hover:border-gold-300 transition-all"
                >
                  {/* Top Meta Line */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-gold-800 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20">
                          {task.taskCode}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${priCfg.bg}`}
                        >
                          {priCfg.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold border ${statCfg.bg}`}
                        >
                          {statCfg.label}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-walnut-600 mt-1">
                        {task.exhibitionTitle}
                      </div>
                    </div>

                    <span className={`p-2 rounded-lg border ${catCfg.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-semibold text-sm text-walnut-900">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-walnut-600 mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>

                  {/* Checklist Sub-items with Live Toggle */}
                  {totalSub > 0 && (
                    <div className="space-y-2 p-3 rounded-lg bg-cream-50/70 border border-cream-100">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-walnut-800">
                          Checklist Sub-Tasks ({doneSub}/{totalSub})
                        </span>
                        <span className="font-mono font-bold text-walnut-700">{subPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-cream-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            subPct === 100 ? 'bg-leaf-600' : 'bg-gold-600'
                          }`}
                          style={{ width: `${subPct}%` }}
                        />
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {task.checklistItems.map((item, idx) => (
                          <div
                            key={item._id || idx}
                            onClick={() => handleToggleSubItem(task._id, idx, item.isDone)}
                            className="flex items-start gap-2 text-xs text-walnut-800 cursor-pointer hover:text-walnut-950 select-none group"
                          >
                            <span className="mt-0.5 text-gold-700 group-hover:scale-110 transition-transform">
                              {item.isDone ? (
                                <CheckSquare className="h-3.5 w-3.5 text-leaf-600" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-walnut-400" />
                              )}
                            </span>
                            <span className={`text-[11px] ${item.isDone ? 'line-through text-walnut-400' : ''}`}>
                              {item.itemText}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Meta: Due Date, Assignee, Proof & Actions */}
                  <div className="pt-2 border-t border-cream-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className={`flex items-center gap-1 ${overdue ? 'text-rose-700 font-bold' : 'text-walnut-600'}`}>
                        <Clock className="h-3.5 w-3.5" />
                        Due: {fmtDate(task.milestoneDueDate)}
                      </span>
                      <span>•</span>
                      <span className="text-walnut-600">
                        Assigned: {task.assignedTo?.name || 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {task.proofDocument && (
                        <span
                          title={`Attached Proof: ${task.proofDocument}`}
                          className="flex items-center gap-1 text-[10px] font-mono text-gold-800 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20"
                        >
                          <FileText className="h-3 w-3" />
                          Doc Attached
                        </span>
                      )}

                      {isStaff && task.status !== 'completed' && (
                        <button
                          onClick={() => {
                            setSignOffModalItem(task);
                            setSignOffForm({
                              remarks: task.remarks || '',
                              proofDocument: task.proofDocument || '',
                            });
                          }}
                          className="btn-primary flex items-center gap-1 text-[11px] py-1 px-2.5 shadow-gold bg-leaf-700 hover:bg-leaf-800"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Sign-Off Gate</span>
                        </button>
                      )}

                      <button
                        onClick={() => setHistoryModalItem(task)}
                        className="p-1 rounded text-walnut-500 hover:bg-cream-100 transition-colors"
                        title="Audit Trail"
                      >
                        <History className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Registry Table Mode */
        <div className="card overflow-hidden border-cream-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/70 text-walnut-800 uppercase font-semibold text-[11px] tracking-wider border-b border-cream-200">
                <tr>
                  <th className="py-3 px-4">Task Code</th>
                  <th className="py-3 px-4">Milestone Title & Category</th>
                  <th className="py-3 px-4">Exhibition</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Checklist Progress</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-walnut-500">
                      Loading registry...
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-walnut-500">
                      No milestone tasks found.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => {
                    const catCfg = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.booth_design;
                    const priCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const statCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
                    const totalSub = task.checklistItems?.length || 0;
                    const doneSub = task.checklistItems?.filter((i) => i.isDone).length || 0;

                    return (
                      <tr key={task._id} className="hover:bg-cream-50/50">
                        <td className="py-3 px-4 font-mono font-semibold text-gold-800">
                          {task.taskCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-walnut-900">{task.title}</div>
                          <div className="text-[10px] text-walnut-500">{catCfg.label}</div>
                        </td>
                        <td className="py-3 px-4 text-walnut-700 font-medium">
                          {task.exhibitionTitle}
                        </td>
                        <td className="py-3 px-4 text-walnut-600 font-mono text-[11px]">
                          {fmtDate(task.milestoneDueDate)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-walnut-800">
                            {doneSub}/{totalSub}
                          </span>
                          <span className="text-[10px] text-walnut-400 ml-1">done</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${priCfg.bg}`}
                          >
                            {priCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statCfg.bg}`}
                          >
                            {statCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setHistoryModalItem(task)}
                            className="p-1 rounded text-walnut-500 hover:bg-cream-200"
                            title="Audit Trail"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD PRE-EXHIBITION MILESTONE */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-xl bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Add Pre-Exhibition Milestone Gate
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Target Exhibition *</label>
                  <select
                    value={newTask.exhibitionTitle}
                    onChange={(e) => setNewTask({ ...newTask, exhibitionTitle: e.target.value })}
                    className="input w-full text-xs"
                  >
                    {exhibitions.map((ex) => (
                      <option key={ex._id} value={ex.title}>
                        {ex.title} ({ex.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Milestone Category *</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                    className="input w-full text-xs"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => (
                      <option key={k} value={k}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Milestone Gate Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ATA Carnet Export Customs Bond Filing"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Gate Description & Objective</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Ensure all temporary export invoices are certified by Indian customs before flight departure."
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Milestone Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newTask.milestoneDueDate}
                    onChange={(e) => setNewTask({ ...newTask, milestoneDueDate: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Priority Level</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="critical">Critical Gate</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Standard</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Assigned Lead</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="">Select Assignee</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Sub-Checklist Action Items (one per line)
                </label>
                <textarea
                  rows="3"
                  placeholder="Enter each sub-step on a new line..."
                  value={newTask.checklistItemsText}
                  onChange={(e) => setNewTask({ ...newTask, checklistItemsText: e.target.value })}
                  className="input w-full text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={create.isPending}
                  className="btn-primary text-xs shadow-gold"
                >
                  {create.isPending ? 'Scheduling...' : 'Schedule Milestone Gate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LEAD SIGN-OFF & VERIFICATION */}
      {signOffModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-leaf-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Manager Milestone Sign-Off
                </h3>
              </div>
              <button
                onClick={() => setSignOffModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800 space-y-1">
              <div className="font-semibold text-gold-800">{signOffModalItem.taskCode}</div>
              <div>{signOffModalItem.title}</div>
              <div className="text-walnut-600">Event: {signOffModalItem.exhibitionTitle}</div>
            </div>

            <form onSubmit={handleSignOffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Attached Proof Document / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Signed_Customs_Bond_FICCI_2026.pdf"
                  value={signOffForm.proofDocument}
                  onChange={(e) => setSignOffForm({ ...signOffForm, proofDocument: e.target.value })}
                  className="input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Manager Verification Remarks *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Physical binder reviewed. Bond validated and archived into audit vault."
                  value={signOffForm.remarks}
                  onChange={(e) => setSignOffForm({ ...signOffForm, remarks: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setSignOffModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary text-xs shadow-gold bg-leaf-700 hover:bg-leaf-800 text-white"
                >
                  {act.isPending ? 'Verifying...' : 'Sign Off & Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT TRAIL */}
      {historyModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-lg bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Pre-Exhibition Milestone Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800">
              <div className="font-semibold text-gold-800">{historyModalItem.taskCode}</div>
              <div>{historyModalItem.title}</div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-xs">
              {(historyModalItem.auditTrail || []).map((step, idx) => (
                <div key={idx} className="relative pl-6 pb-3 border-l-2 border-gold-300 last:border-l-0">
                  <div className="absolute -left-1.5 top-0.5 h-3 w-3 rounded-full bg-gold-600 border-2 border-white" />
                  <div className="font-semibold text-walnut-900 flex items-center justify-between">
                    <span>{step.action?.replace('_', ' ')}</span>
                    <span className="text-[10px] text-walnut-400 font-normal">
                      {fmtDateTime(step.timestamp)}
                    </span>
                  </div>
                  <div className="text-walnut-600 text-[11px] mt-0.5">{step.notes}</div>
                  <div className="text-walnut-400 text-[10px] mt-0.5">
                    By: {step.performedByName || 'System'}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-cream-200">
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="btn-ghost text-xs text-walnut-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
