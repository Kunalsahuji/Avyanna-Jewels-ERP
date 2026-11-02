import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate, isOverdue } from '../lib.js';
import {
  Gem,
  Hammer,
  Sparkles,
  Search,
  Filter,
  Download,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldCheck,
  History,
  Scale,
  Layers,
  ChevronRight,
  UserCheck,
  BadgeAlert,
  Boxes,
  FileCheck
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

const STAGES = [
  { key: 'cad_design', label: 'CAD & 3D Wax', step: 1 },
  { key: 'casting', label: 'Tree Casting', step: 2 },
  { key: 'filing_grinding', label: 'Filing & Assembly', step: 3 },
  { key: 'diamond_setting', label: 'Diamond Setting', step: 4 },
  { key: 'polishing_rhodium', label: 'Polishing & Rhodium', step: 5 },
  { key: 'quality_qc', label: 'QC & Hallmarking', step: 6 },
  { key: 'completed', label: 'Completed Vault', step: 7 },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));

const PRIORITY_CONFIG = {
  rush_urgent: { label: 'Rush Urgent', bg: 'bg-rose-500/15 text-rose-700 border-rose-500/30' },
  high: { label: 'High Priority', bg: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
  medium: { label: 'Medium', bg: 'bg-gold-500/15 text-gold-800 border-gold-500/30' },
  low: { label: 'Standard', bg: 'bg-cream-200 text-walnut-700 border-cream-300' },
};

const CATEGORIES = [
  { value: 'ring', label: 'Ring' },
  { value: 'necklace', label: 'Necklace' },
  { value: 'bangle', label: 'Bangle' },
  { value: 'earring', label: 'Earring' },
  { value: 'bracelet', label: 'Bracelet' },
  { value: 'pendant', label: 'Pendant' },
  { value: 'bespoke', label: 'Bespoke Order' },
];

export default function ProductionFmsPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'pipeline'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [advanceJobItem, setAdvanceJobItem] = useState(null);
  const [qcJobItem, setQcJobItem] = useState(null);
  const [historyJobItem, setHistoryJobItem] = useState(null);

  // Form states
  const [newJob, setNewJob] = useState({
    title: '',
    designCode: '',
    clientOrderNo: '',
    category: 'ring',
    purity: '18K',
    priority: 'medium',
    currentStage: 'cad_design',
    assignedKarigar: '',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    initialGoldWeight: '',
    totalDiamondsPieces: '',
    totalDiamondsCarat: '',
    notes: '',
  });

  const [advanceForm, setAdvanceForm] = useState({
    nextStage: 'filing_grinding',
    karigarId: '',
    returnedWeight: '',
    notes: '',
  });

  const [qcForm, setQcForm] = useState({
    passed: true,
    findings: '',
    huidCode: '',
  });

  const { data: users = [] } = useUsers();
  const karigars = useMemo(
    () => users.filter((u) => u.department === 'Production' || u.role === 'doer'),
    [users]
  );

  const queryParams = useMemo(() => {
    const q = {};
    if (stageFilter) q.currentStage = stageFilter;
    if (priorityFilter) q.priority = priorityFilter;
    if (categoryFilter) q.category = categoryFilter;
    if (search) q.search = search;
    return q;
  }, [stageFilter, priorityFilter, categoryFilter, search]);

  const { data: listData, isLoading } = useList('production', queryParams);
  const { data: stats } = useStats('production', queryParams);
  const { create, act } = useResourceMutation('production');

  const jobs = listData?.items || [];

  // Handlers
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    create.mutate(
      {
        ...newJob,
        initialGoldWeight: Number(newJob.initialGoldWeight),
        currentGoldWeight: Number(newJob.initialGoldWeight),
        totalDiamondsPieces: Number(newJob.totalDiamondsPieces) || 0,
        totalDiamondsCarat: Number(newJob.totalDiamondsCarat) || 0,
        assignedKarigar: newJob.assignedKarigar || null,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewJob({
            title: '',
            designCode: '',
            clientOrderNo: '',
            category: 'ring',
            purity: '18K',
            priority: 'medium',
            currentStage: 'cad_design',
            assignedKarigar: '',
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            initialGoldWeight: '',
            totalDiamondsPieces: '',
            totalDiamondsCarat: '',
            notes: '',
          });
        },
      }
    );
  };

  const handleAdvanceSubmit = (e) => {
    e.preventDefault();
    if (!advanceJobItem) return;
    act.mutate(
      {
        id: advanceJobItem._id,
        action: 'advance-stage',
        body: {
          nextStage: advanceForm.nextStage,
          karigarId: advanceForm.karigarId || undefined,
          returnedWeight: advanceForm.returnedWeight ? Number(advanceForm.returnedWeight) : undefined,
          notes: advanceForm.notes,
        },
      },
      {
        onSuccess: () => {
          setAdvanceJobItem(null);
          setAdvanceForm({ nextStage: 'filing_grinding', karigarId: '', returnedWeight: '', notes: '' });
        },
      }
    );
  };

  const handleQcSubmit = (e) => {
    e.preventDefault();
    if (!qcJobItem) return;
    act.mutate(
      {
        id: qcJobItem._id,
        action: 'qc-inspect',
        body: qcForm,
      },
      {
        onSuccess: () => {
          setQcJobItem(null);
          setQcForm({ passed: true, findings: '', huidCode: '' });
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!jobs.length) return;
    const headers = [
      'Job No',
      'Design Code',
      'Title',
      'Category',
      'Purity',
      'Current Stage',
      'Priority',
      'Initial Gold Wt (g)',
      'Current Gold Wt (g)',
      'Total Gold Loss (g)',
      'Diamonds (ct)',
      'Diamonds (pcs)',
      'Assigned Karigar',
      'Due Date',
      'Status',
    ];
    const rows = jobs.map((j) => [
      j.jobNo,
      j.designCode,
      `"${j.title}"`,
      j.category,
      j.purity,
      STAGE_MAP[j.currentStage]?.label || j.currentStage,
      j.priority,
      j.initialGoldWeight,
      j.currentGoldWeight,
      j.totalGoldLoss || 0,
      j.totalDiamondsCarat || 0,
      j.totalDiamondsPieces || 0,
      j.assignedKarigar?.name || 'Unassigned',
      fmtDate(j.dueDate),
      j.status,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tvisha_production_jobs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-cream-200/80 bg-gradient-to-r from-cream-100 via-white to-cream-50 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-walnut-950">
                Production FMS &amp; Factory Pipeline
              </span>
              <span className="flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-400/20 px-2.5 py-0.5 text-[11px] font-bold text-gold-700">
                <Hammer className="h-3 w-3" /> Factory Workshop Live
              </span>
            </div>
            <p className="mt-1 text-xs text-walnut-600">
              End-to-end artisan stage tracking: CAD Modeling, Casting, Filing &amp; Assembly, Diamond Setting, Polishing, and BIS Quality Inspection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-lg border border-cream-300 bg-white p-0.5 shadow-xs text-xs">
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  viewMode === 'table' ? 'bg-walnut-800 text-cream-50' : 'text-walnut-600 hover:text-walnut-950'
                }`}
              >
                Jobs Table
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`rounded-md px-3 py-1 font-semibold transition ${
                  viewMode === 'pipeline' ? 'bg-walnut-800 text-cream-50' : 'text-walnut-600 hover:text-walnut-950'
                }`}
              >
                Stage Pipeline
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="btn-ghost flex items-center gap-1.5 text-xs shadow-xs"
              title="Export production orders to CSV"
            >
              <Download className="h-3.5 w-3.5 text-walnut-600" /> Export Excel
            </button>
            {isStaff && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center gap-1.5 text-xs shadow-sm"
              >
                <Plus className="h-4 w-4 text-gold-400" /> Intake New Job
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Active Jobs */}
        <div
          onClick={() => setStageFilter('')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            stageFilter === '' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-walnut-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Jobs</span>
            <Boxes className="h-4 w-4 text-walnut-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">
            {stats?.totalJobs ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-walnut-500">manufacturing orders</p>
        </div>

        {/* CAD & Casting */}
        <div
          onClick={() => setStageFilter('casting')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            stageFilter === 'casting' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-gold-700">
            <span className="text-xs font-semibold uppercase tracking-wider">CAD &amp; Casting</span>
            <Sparkles className="h-4 w-4 text-gold-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-gold-700">
            {stats?.inCasting ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-gold-600">foundry &amp; wax stage</p>
        </div>

        {/* Filing & Setting */}
        <div
          onClick={() => setStageFilter('diamond_setting')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            stageFilter === 'diamond_setting' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Filing &amp; Setting</span>
            <Gem className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-sky-700">
            {stats?.inSetting ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-sky-600">artisan diamond bench</p>
        </div>

        {/* Polishing & QC */}
        <div
          onClick={() => setStageFilter('quality_qc')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            stageFilter === 'quality_qc' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-leaf-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Polishing &amp; QC</span>
            <ShieldCheck className="h-4 w-4 text-leaf-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-leaf-700">
            {stats?.inQc ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-leaf-600">final inspection &amp; HUID</p>
        </div>

        {/* Rush Urgent */}
        <div
          onClick={() => setPriorityFilter('rush_urgent')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            priorityFilter === 'rush_urgent' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Rush Orders</span>
            <Flame className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-rose-700">
            {stats?.rushOrders ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-rose-600">tight delivery cutoffs</p>
        </div>

        {/* Gold in Factory Line */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-walnut-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Gold in Line</span>
            <span className="font-mono text-xs font-bold text-gold-600">METAL</span>
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-walnut-950">
            {stats?.totalGoldInProcess ?? 0}
            <span className="text-sm font-normal text-walnut-500"> g</span>
          </p>
          <p className="mt-1 text-[11px] text-walnut-500">
            Diamonds: <b>{stats?.totalDiamondsInProcess ?? 0} ct</b>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-walnut-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Job No, design code, title, order #, or HUID..."
                className="input py-1.5 pl-9 text-xs"
              />
            </div>

            {/* Stage filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Production Stages</option>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Priorities</option>
              <option value="rush_urgent">Rush Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Standard</option>
            </select>

            {/* Category filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Jewelry Types</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-walnut-500">
            <span>Showing <b>{jobs.length}</b> manufacturing orders</span>
          </div>
        </div>
      </div>

      {/* View 1: Main Jobs Table */}
      {viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-cream-200 bg-cream-100 text-walnut-700">
                <tr>
                  <th className="px-4 py-3 font-bold">Job No &amp; Priority</th>
                  <th className="px-4 py-3 font-bold">Design Code &amp; Title</th>
                  <th className="px-4 py-3 font-bold">Current Stage &amp; Progress</th>
                  <th className="px-4 py-3 font-bold">Craftsman / Karigar</th>
                  <th className="px-4 py-3 font-bold">Gold Wt &amp; Loss (g)</th>
                  <th className="px-4 py-3 font-bold">Diamonds (ct)</th>
                  <th className="px-4 py-3 font-bold">Due Date</th>
                  <th className="px-4 py-3 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-walnut-500">
                      Loading manufacturing jobs…
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-walnut-500">
                      No production jobs found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => {
                    const priorityCfg = PRIORITY_CONFIG[job.priority] || PRIORITY_CONFIG.medium;
                    const stageCfg = STAGE_MAP[job.currentStage] || STAGES[0];
                    const overdue = isOverdue(job.dueDate) && job.currentStage !== 'completed';
                    const progressPct = Math.round(((job.stageIndex + 1) / STAGES.length) * 100);

                    return (
                      <tr key={job._id} className="transition hover:bg-cream-50/60">
                        {/* Job No & Priority */}
                        <td className="px-4 py-3">
                          <div className="font-mono text-xs font-bold text-gold-700">
                            {job.jobNo}
                          </div>
                          <span
                            className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${priorityCfg.bg}`}
                          >
                            {priorityCfg.label}
                          </span>
                        </td>

                        {/* Design & Title */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-walnut-950">{job.title}</div>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-walnut-500">
                            <span>Code: {job.designCode}</span>
                            {job.clientOrderNo && <span>· Order: {job.clientOrderNo}</span>}
                          </div>
                        </td>

                        {/* Stage & Progress Bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-walnut-800">{stageCfg.label}</span>
                            <span className="font-mono text-[10px] text-walnut-500">
                              Stage {stageCfg.step}/{STAGES.length}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-cream-200">
                            <div
                              className="h-full bg-gradient-to-r from-gold-500 to-leaf-500 transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </td>

                        {/* Craftsman */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-walnut-800 text-[9px] font-bold text-gold-300">
                              {(job.assignedKarigar?.name || 'K')
                                .split(' ')
                                .map((w) => w[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <span className="font-medium text-walnut-900">
                              {job.assignedKarigar?.name || 'Unassigned'}
                            </span>
                          </div>
                        </td>

                        {/* Gold Weight & Loss */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-walnut-900">
                            {job.currentGoldWeight}g{' '}
                            <span className="text-[10px] text-walnut-500">({job.purity})</span>
                          </div>
                          <div className="text-[10px] text-walnut-500">
                            Initial: {job.initialGoldWeight}g ·{' '}
                            <span className={job.totalGoldLoss > 0.3 ? 'font-bold text-brick-600' : 'text-walnut-600'}>
                              Loss: {job.totalGoldLoss}g
                            </span>
                          </div>
                        </td>

                        {/* Diamonds */}
                        <td className="px-4 py-3">
                          {job.totalDiamondsCarat > 0 ? (
                            <div className="font-semibold text-sky-800">
                              {job.totalDiamondsCarat} ct{' '}
                              <span className="text-[10px] text-walnut-500">
                                ({job.totalDiamondsPieces} pcs)
                              </span>
                            </div>
                          ) : (
                            <span className="text-walnut-400">—</span>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className={overdue ? 'font-bold text-brick-600' : 'text-walnut-700'}>
                              {fmtDate(job.dueDate)}
                            </span>
                            {overdue && (
                              <AlertTriangle className="h-3.5 w-3.5 text-brick-500" title="Overdue production order!" />
                            )}
                          </div>
                        </td>

                        {/* Action Tray */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Advance Stage button */}
                            {job.currentStage !== 'completed' && isStaff && (
                              <button
                                onClick={() => {
                                  const nextIdx = Math.min(job.stageIndex + 1, STAGES.length - 1);
                                  setAdvanceJobItem(job);
                                  setAdvanceForm({
                                    nextStage: STAGES[nextIdx].key,
                                    karigarId: job.assignedKarigar?._id || '',
                                    returnedWeight: job.currentGoldWeight,
                                    notes: '',
                                  });
                                }}
                                className="btn inline-flex items-center gap-1 rounded bg-[#21170d] px-2 py-1 text-[10px] font-bold text-white hover:bg-walnut-700 shadow-xs"
                                title="Advance to Next Stage & Weigh Gold"
                              >
                                Advance <ArrowRight className="h-3 w-3" />
                              </button>
                            )}

                            {/* QC Button (if at quality_qc) */}
                            {job.currentStage === 'quality_qc' && isStaff && (
                              <button
                                onClick={() => {
                                  setQcJobItem(job);
                                  setQcForm({ passed: true, findings: '', huidCode: job.huid || '' });
                                }}
                                className="btn inline-flex items-center gap-1 rounded bg-leaf-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-leaf-700 shadow-xs"
                                title="Quality Inspection & Hallmarking Sign-off"
                              >
                                <FileCheck className="h-3 w-3" /> QC
                              </button>
                            )}

                            {/* Audit History & Karigar chain */}
                            <button
                              onClick={() => setHistoryJobItem(job)}
                              className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-walnut-950"
                              title="Production History & Karigar Chain of Custody"
                            >
                              <History className="h-4 w-4 text-gold-700" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View 2: Pipeline Stages Kanban */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 overflow-x-auto pb-4">
          {STAGES.slice(0, 6).map((stage) => {
            const stageJobs = jobs.filter((j) => j.currentStage === stage.key);

            return (
              <div key={stage.key} className="flex flex-col rounded-xl border border-cream-200 bg-cream-50/70 p-3 shadow-xs">
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-cream-200 pb-2.5">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-gold-700">Stage {stage.step}</span>
                    <h4 className="font-display text-xs font-bold text-walnut-950">{stage.label}</h4>
                  </div>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white font-mono text-[10px] font-bold text-walnut-800 shadow-xs">
                    {stageJobs.length}
                  </span>
                </div>

                {/* Job Cards in Column */}
                <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto max-h-[500px]">
                  {stageJobs.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-walnut-400">
                      No jobs at this stage
                    </div>
                  ) : (
                    stageJobs.map((j) => (
                      <div
                        key={j._id}
                        className="rounded-lg border border-cream-200 bg-white p-2.5 shadow-xs transition hover:shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-gold-700">{j.jobNo}</span>
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[8px] font-bold uppercase ${
                              PRIORITY_CONFIG[j.priority]?.bg || ''
                            }`}
                          >
                            {j.priority}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-walnut-950 text-xs line-clamp-1">{j.title}</p>
                        <p className="font-mono text-[10px] text-walnut-500">{j.designCode}</p>

                        <div className="mt-2 flex items-center justify-between border-t border-cream-100 pt-1.5 text-[10px] text-walnut-600">
                          <span>Gold: <b>{j.currentGoldWeight}g</b></span>
                          <span className="text-walnut-500">{j.assignedKarigar?.name?.split(' ')[0] || 'Unassigned'}</span>
                        </div>

                        <div className="mt-2 flex justify-end gap-1">
                          <button
                            onClick={() => setHistoryJobItem(j)}
                            className="rounded p-1 text-walnut-400 hover:text-walnut-900"
                            title="View History"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          {isStaff && (
                            <button
                              onClick={() => {
                                const nextIdx = Math.min(j.stageIndex + 1, STAGES.length - 1);
                                setAdvanceJobItem(j);
                                setAdvanceForm({
                                  nextStage: STAGES[nextIdx].key,
                                  karigarId: j.assignedKarigar?._id || '',
                                  returnedWeight: j.currentGoldWeight,
                                  notes: '',
                                });
                              }}
                              className="rounded bg-walnut-800 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-walnut-700 flex items-center gap-0.5"
                            >
                              Next <ChevronRight className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Intake New Production Job */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Intake New Production Order
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label">Item Title *</label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  placeholder="e.g. 18K Yellow Gold Floral Diamond Stud Earrings"
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Design Reference Code *</label>
                  <input
                    type="text"
                    required
                    value={newJob.designCode}
                    onChange={(e) => setNewJob({ ...newJob, designCode: e.target.value.toUpperCase() })}
                    placeholder="TJ-EAR-2026-88"
                    className="input font-mono uppercase text-xs"
                  />
                </div>

                <div>
                  <label className="label">Client Order / Booking No</label>
                  <input
                    type="text"
                    value={newJob.clientOrderNo}
                    onChange={(e) => setNewJob({ ...newJob, clientOrderNo: e.target.value.toUpperCase() })}
                    placeholder="ORD-7741"
                    className="input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select
                    value={newJob.category}
                    onChange={(e) => setNewJob({ ...newJob, category: e.target.value })}
                    className="input text-xs"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Metal Purity</label>
                  <select
                    value={newJob.purity}
                    onChange={(e) => setNewJob({ ...newJob, purity: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="14K">14K Gold</option>
                    <option value="18K">18K Gold</option>
                    <option value="22K">22K Gold</option>
                    <option value="24K">24K Bullion</option>
                    <option value="950 Platinum">950 Platinum</option>
                  </select>
                </div>

                <div>
                  <label className="label">Order Priority</label>
                  <select
                    value={newJob.priority}
                    onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="rush_urgent">Rush Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Standard</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Initial Gold Wt (g) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newJob.initialGoldWeight}
                    onChange={(e) => setNewJob({ ...newJob, initialGoldWeight: e.target.value })}
                    placeholder="15.50"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Diamonds Carats (ct)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newJob.totalDiamondsCarat}
                    onChange={(e) => setNewJob({ ...newJob, totalDiamondsCarat: e.target.value })}
                    placeholder="1.20"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Diamond Pieces</label>
                  <input
                    type="number"
                    value={newJob.totalDiamondsPieces}
                    onChange={(e) => setNewJob({ ...newJob, totalDiamondsPieces: e.target.value })}
                    placeholder="24"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Initial Karigar / Craftsman</label>
                  <select
                    value={newJob.assignedKarigar}
                    onChange={(e) => setNewJob({ ...newJob, assignedKarigar: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="">Select Craftsman</option>
                    {karigars.map((k) => (
                      <option key={k._id} value={k._id}>
                        {k.name} ({k.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Delivery Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newJob.dueDate}
                    onChange={(e) => setNewJob({ ...newJob, dueDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label">Craftsman Instructions &amp; Specifications</label>
                <textarea
                  rows={2}
                  value={newJob.notes}
                  onChange={(e) => setNewJob({ ...newJob, notes: e.target.value })}
                  placeholder="Special instructions for wax modeling, prong thickness, etc."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary text-xs">
                  {create.isPending ? 'Scheduling…' : 'Issue Production Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Advance Stage & Metal Loss Reconciliation */}
      {advanceJobItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Advance Stage: {advanceJobItem.jobNo}
              </h3>
              <button onClick={() => setAdvanceJobItem(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdvanceSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs space-y-1">
                <p className="font-semibold text-walnut-950">{advanceJobItem.title}</p>
                <p className="text-walnut-700">
                  Current Stage: <b>{STAGE_MAP[advanceJobItem.currentStage]?.label}</b>
                </p>
                <p className="text-walnut-600">
                  Issued Weight: <b>{advanceJobItem.currentGoldWeight}g</b> · Current Karigar: <b>{advanceJobItem.assignedKarigar?.name || 'Unassigned'}</b>
                </p>
              </div>

              <div>
                <label className="label">Next Pipeline Stage *</label>
                <select
                  value={advanceForm.nextStage}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, nextStage: e.target.value })}
                  className="input text-xs"
                >
                  {STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      Stage {s.step}: {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Returned Gold Weight (grams) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={advanceForm.returnedWeight}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, returnedWeight: e.target.value })}
                  placeholder="Weighed return in grams"
                  className="input font-mono font-bold text-xs"
                />
                {advanceForm.returnedWeight && (
                  <p className="mt-1 text-[11px] font-semibold text-walnut-600">
                    {advanceJobItem.currentGoldWeight > Number(advanceForm.returnedWeight) ? (
                      <span className="text-amber-700">
                        ⚠ Metal loss for this stage: {(advanceJobItem.currentGoldWeight - Number(advanceForm.returnedWeight)).toFixed(3)}g
                      </span>
                    ) : (
                      <span className="text-leaf-600">✓ No metal loss recorded</span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Assign Karigar for Next Stage</label>
                <select
                  value={advanceForm.karigarId}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, karigarId: e.target.value })}
                  className="input text-xs"
                >
                  <option value="">Keep current / Select Craftsman</option>
                  {karigars.map((k) => (
                    <option key={k._id} value={k._id}>
                      {k.name} ({k.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Stage Completion Notes</label>
                <textarea
                  rows={2}
                  value={advanceForm.notes}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                  placeholder="e.g. Tree casting cut; filing smooth. Handed over to diamond setter..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setAdvanceJobItem(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn-primary text-xs">
                  {act.isPending ? 'Advancing…' : 'Reconcile & Advance Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: QC & Hallmarking Inspection */}
      {qcJobItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Quality QC &amp; BIS Hallmarking
              </h3>
              <button onClick={() => setQcJobItem(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQcSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs space-y-1">
                <p className="font-mono font-bold text-gold-700">{qcJobItem.jobNo} · {qcJobItem.designCode}</p>
                <p className="font-semibold text-walnut-950">{qcJobItem.title}</p>
                <p className="text-walnut-600">
                  Final Gold Weight: <b>{qcJobItem.currentGoldWeight}g ({qcJobItem.purity})</b> · Diamonds: <b>{qcJobItem.totalDiamondsCarat}ct</b>
                </p>
              </div>

              <div>
                <label className="label">BIS Hallmarking HUID Code *</label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={qcForm.huidCode}
                  onChange={(e) => setQcForm({ ...qcForm, huidCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. TJ889K"
                  className="input font-mono uppercase font-bold text-xs"
                />
              </div>

              <div>
                <label className="label">QC Inspection Result</label>
                <div className="flex gap-3 pt-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-leaf-700 cursor-pointer">
                    <input
                      type="radio"
                      name="passed"
                      checked={qcForm.passed === true}
                      onChange={() => setQcForm({ ...qcForm, passed: true })}
                    />
                    Pass &amp; Ready for Vault
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 cursor-pointer">
                    <input
                      type="radio"
                      name="passed"
                      checked={qcForm.passed === false}
                      onChange={() => setQcForm({ ...qcForm, passed: false })}
                    />
                    Flag Defects (Put On Hold)
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Inspection Findings &amp; Loupe Check Notes</label>
                <textarea
                  rows={3}
                  value={qcForm.findings}
                  onChange={(e) => setQcForm({ ...qcForm, findings: e.target.value })}
                  placeholder="Checked prong tightness, mirror polish finish, and hallmark stamp..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setQcJobItem(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn inline-flex items-center gap-1 rounded bg-leaf-600 px-4 py-2 text-xs font-bold text-white hover:bg-leaf-700">
                  {act.isPending ? 'Submitting…' : 'Sign Off Quality Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Production Job History & Karigar Audit Timeline (Matching Luxury Reference Theme) */}
      {historyJobItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-white">
            {/* Dark Header */}
            <div className="bg-[#241710] px-6 py-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold tracking-wide text-cream-100">
                      {historyJobItem.jobNo}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/40 bg-gold-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-200">
                      <Hammer className="h-3 w-3" />
                      {STAGE_MAP[historyJobItem.currentStage]?.label || historyJobItem.currentStage}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-cream-200/90 font-normal">
                    {historyJobItem.title} ({historyJobItem.designCode})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryJobItem(null)}
                  className="rounded p-1 text-cream-300 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs text-walnut-800">
              {/* Key Specs Card */}
              <div className="divide-y divide-cream-200 border-b border-cream-200 pb-2">
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Design &amp; Order</span>
                  <span className="font-semibold text-walnut-900">{historyJobItem.designCode} {historyJobItem.clientOrderNo && `· Order: ${historyJobItem.clientOrderNo}`}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Metal Purity</span>
                  <span className="font-semibold text-walnut-900">{historyJobItem.purity} Gold</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Metal Weights</span>
                  <span className="font-semibold text-walnut-900">
                    Initial: {historyJobItem.initialGoldWeight}g · Current: {historyJobItem.currentGoldWeight}g
                  </span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Total Metal Loss</span>
                  <span className={`font-semibold ${historyJobItem.totalGoldLoss > 0.3 ? 'text-brick-600' : 'text-walnut-900'}`}>
                    {historyJobItem.totalGoldLoss}g ({((historyJobItem.totalGoldLoss / historyJobItem.initialGoldWeight) * 100).toFixed(2)}% loss)
                  </span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Diamonds Issued</span>
                  <span className="font-semibold text-walnut-900">
                    {historyJobItem.totalDiamondsCarat ? `${historyJobItem.totalDiamondsCarat}ct (${historyJobItem.totalDiamondsPieces} pcs)` : 'None'}
                  </span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">BIS Hallmarking</span>
                  <span className="font-mono font-bold text-gold-700">{historyJobItem.huid || 'Awaiting Final QC'}</span>
                </div>
              </div>

              {/* Stage History Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  STAGE-BY-STAGE KARIGAR CHAIN OF CUSTODY
                </h4>

                <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cream-300">
                  {historyJobItem.stageHistory?.length ? (
                    historyJobItem.stageHistory.map((s, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-walnut-400 bg-white" />
                        <div className="text-xs">
                          <span className="font-medium text-walnut-600">
                            {fmtDateTime(s.startedAt)} {s.completedAt && `→ ${fmtDateTime(s.completedAt)}`} • {s.karigar?.name || 'Artisan Workshop'}
                          </span>
                          <div className="mt-1 rounded border-l-2 border-gold-500 bg-cream-50 px-3 py-1.5 text-walnut-800">
                            <div className="flex items-center justify-between font-bold uppercase text-[10px] text-gold-700">
                              <span>{STAGE_MAP[s.stage]?.label || s.stage}</span>
                              {s.metalLoss > 0 && (
                                <span className="text-brick-600 font-mono">Loss: {s.metalLoss}g</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-walnut-700">{s.notes || 'Stage operations processed.'}</p>
                            {s.huidCode && (
                              <p className="mt-0.5 font-mono text-[10px] text-sky-700 font-bold">
                                BIS HUID Stamp: {s.huidCode}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-walnut-400">No stage history logged yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Bottom Footer */}
            <div className="border-t border-cream-200 bg-[#fbf7f2] px-6 py-3 flex justify-between items-center">
              <span className="text-[10px] font-mono text-walnut-400">
                TVISHA JEWLZ FACTORY LEDGER
              </span>
              <button
                type="button"
                onClick={() => setHistoryJobItem(null)}
                className="rounded-lg border border-cream-300 bg-white px-5 py-1.5 text-xs font-semibold text-walnut-700 hover:bg-cream-50 transition shadow-xs"
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
