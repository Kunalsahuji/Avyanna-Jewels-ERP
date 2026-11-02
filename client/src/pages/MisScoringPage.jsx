import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate } from '../lib.js';
import {
  Trophy,
  Award,
  TrendingUp,
  Search,
  Filter,
  Download,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Building2,
  Users,
  Target,
  FileCheck2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Star,
  Zap,
} from 'lucide-react';

const GRADE_CONFIG = {
  'A+': { label: 'Grade A+ (Elite)', tone: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30' },
  A: { label: 'Grade A (Exceeds)', tone: 'bg-gold-500/15 text-gold-800 border-gold-500/30' },
  B: { label: 'Grade B (Proficient)', tone: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
  C: { label: 'Grade C (Developing)', tone: 'bg-rose-500/15 text-rose-800 border-rose-500/30' },
  D: { label: 'Grade D (Critical)', tone: 'bg-rose-500/25 text-rose-900 border-rose-500/50' },
};

const BAND_LABELS = {
  exceptional: 'Exceptional (Incentive Tier 1)',
  exceeds_expectations: 'Exceeds Expectations (Incentive Tier 2)',
  meets_expectations: 'Meets Expectations',
  needs_improvement: 'Needs Performance Coaching',
  critical_attention: 'Critical Attention Required',
};

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

export default function MisScoringPage() {
  const { user, isStaff } = useAuth();
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [period, setPeriod] = useState(currentPeriod);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [expandedCards, setExpandedCards] = useState({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [signOffModalItem, setSignOffModalItem] = useState(null);
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Forms
  const [newEval, setNewEval] = useState({
    userId: '',
    period: currentPeriod,
    kpi1_name: 'Core Job Delivery & SLA',
    kpi1_score: 95,
    kpi1_weight: 40,
    kpi2_name: 'Checklist & Compliance Discipline',
    kpi2_score: 90,
    kpi2_weight: 30,
    kpi3_name: 'Quality & Metal Loss Control',
    kpi3_score: 92,
    kpi3_weight: 30,
    appraisalNotes: '',
  });

  const [signOffNotes, setSignOffNotes] = useState('');

  const { data: users = [] } = useUsers();

  const queryParams = useMemo(() => {
    const q = { period };
    if (deptFilter) q.department = deptFilter;
    if (gradeFilter) q.grade = gradeFilter;
    if (search) q.search = search;
    return q;
  }, [period, deptFilter, gradeFilter, search]);

  const { data: listData, isLoading } = useList('mis', queryParams);
  const { data: stats } = useStats('mis', queryParams);
  const { create, act } = useResourceMutation('mis');

  const scores = listData?.items || [];

  const toggleExpand = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const selUser = users.find((u) => u._id === newEval.userId);
    if (!selUser) return;

    const kpis = [
      {
        kpiName: newEval.kpi1_name,
        target: 100,
        actual: Number(newEval.kpi1_score),
        weightPct: Number(newEval.kpi1_weight),
        score: Number(newEval.kpi1_score),
        weightedScore: (Number(newEval.kpi1_score) * Number(newEval.kpi1_weight)) / 100,
      },
      {
        kpiName: newEval.kpi2_name,
        target: 100,
        actual: Number(newEval.kpi2_score),
        weightPct: Number(newEval.kpi2_weight),
        score: Number(newEval.kpi2_score),
        weightedScore: (Number(newEval.kpi2_score) * Number(newEval.kpi2_weight)) / 100,
      },
      {
        kpiName: newEval.kpi3_name,
        target: 100,
        actual: Number(newEval.kpi3_score),
        weightPct: Number(newEval.kpi3_weight),
        score: Number(newEval.kpi3_score),
        weightedScore: (Number(newEval.kpi3_score) * Number(newEval.kpi3_weight)) / 100,
      },
    ];

    create.mutate(
      {
        userId: selUser._id,
        userName: selUser.name,
        department: selUser.department || 'Management',
        role: selUser.role,
        period: newEval.period,
        kpis,
        appraisalNotes: newEval.appraisalNotes || 'Monthly appraisal completed by executive management.',
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewEval({
            userId: '',
            period: currentPeriod,
            kpi1_name: 'Core Job Delivery & SLA',
            kpi1_score: 95,
            kpi1_weight: 40,
            kpi2_name: 'Checklist & Compliance Discipline',
            kpi2_score: 90,
            kpi2_weight: 30,
            kpi3_name: 'Quality & Metal Loss Control',
            kpi3_score: 92,
            kpi3_weight: 30,
            appraisalNotes: '',
          });
        },
      }
    );
  };

  const handleSignOffSubmit = (e) => {
    e.preventDefault();
    if (!signOffModalItem) return;
    act.mutate(
      {
        id: signOffModalItem._id,
        action: 'approve',
        body: { remarks: signOffNotes },
      },
      {
        onSuccess: () => {
          setSignOffModalItem(null);
          setSignOffNotes('');
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!scores.length) return;
    const headers = ['Period', 'Employee', 'Department', 'Role', 'Composite Score', 'Grade', 'Performance Band', 'Sign Off'];
    const rows = scores.map((s) => [
      s.period,
      `"${s.userName}"`,
      s.department,
      s.role,
      s.compositeScore,
      s.grade,
      `"${s.performanceBand}"`,
      s.signOffStatus,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MIS_Scores_${period}.csv`);
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
            <span>Avyanna ERP</span>
            <span className="mx-2">›</span>
            <span className="text-gold-700 font-semibold">MIS Scoring</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut-900 sm:text-3xl">
              Executive MIS Scoring & Performance Index
            </h1>
            <span className="inline-flex items-center rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-gold-800 border border-gold-500/20">
              Monthly Appraisal
            </span>
          </div>
          <p className="mt-1 text-xs text-walnut-600">
            Departmental efficiency scores, Karigar gold loss metrics, sales KPIs & executive appraisal bands.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-ghost flex items-center gap-1.5 text-xs font-medium text-walnut-700 border border-cream-300 bg-white shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
          {isStaff && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs font-semibold shadow-gold"
            >
              <Plus className="h-4 w-4" />
              <span>Evaluate Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-gold-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gold-900 uppercase tracking-wider">Enterprise MIS</span>
            <Trophy className="h-4 w-4 text-gold-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-gold-900">
            {stats?.averageScore || 0} <span className="text-xs font-sans font-normal text-walnut-500">/ 100</span>
          </div>
          <div className="mt-1 text-[11px] text-gold-700">Company-wide weighted avg</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-emerald-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">Grade A+ Elite</span>
            <Award className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-emerald-900">
            {stats?.gradeAPlus || 0}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">Scored 90% and above</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-sky-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-900 uppercase tracking-wider">Top Department</span>
            <Building2 className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-sky-900 truncate">
            {stats?.topDepartment || 'Quality'}
          </div>
          <div className="mt-1 text-[11px] text-sky-700">Avg {stats?.topDepartmentScore || 0}%</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-purple-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">Incentive Tier</span>
            <Zap className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-purple-900">
            {stats?.incentiveEligible || 0}
          </div>
          <div className="mt-1 text-[11px] text-purple-700">Staff qualifying for bonus</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-leaf-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-leaf-900 uppercase tracking-wider">Evaluated</span>
            <Users className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-leaf-900">
            {stats?.totalEvaluations || 0}
          </div>
          <div className="mt-1 text-[11px] text-leaf-700">Monthly scores published</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-rose-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-900 uppercase tracking-wider">Needs Radar</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-rose-900">
            {stats?.needsImprovement || 0}
          </div>
          <div className="mt-1 text-[11px] text-rose-700">Grade C or D flagged</div>
        </div>
      </div>

      {/* Filter and Period Control Toolbar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut-400" />
            <input
              type="text"
              placeholder="Search employee, department, appraisal notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full bg-cream-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50 font-mono font-semibold text-gold-900"
            >
              <option value="2026-11">Period: Nov 2026</option>
              <option value="2026-10">Period: Oct 2026</option>
              <option value="2026-09">Period: Sep 2026</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Departments</option>
              <option value="Management">Management</option>
              <option value="Production">Production</option>
              <option value="Sales">Sales</option>
              <option value="Accounts">Accounts</option>
              <option value="Quality">Quality</option>
            </select>

            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Grades</option>
              <option value="A+">Grade A+ (90%+)</option>
              <option value="A">Grade A (80-89%)</option>
              <option value="B">Grade B (70-79%)</option>
              <option value="C">Grade C (60-69%)</option>
              <option value="D">Grade D (&lt; 60%)</option>
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
                Leaderboard Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'table'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                KPI Breakdown Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full card p-12 text-center text-xs text-walnut-500 bg-white">
              Loading MIS performance scores...
            </div>
          ) : scores.length === 0 ? (
            <div className="col-span-full card p-12 text-center text-xs text-walnut-500 bg-white">
              No MIS evaluations found for period {period}.
            </div>
          ) : (
            scores.map((s, idx) => {
              const gradeCfg = GRADE_CONFIG[s.grade] || GRADE_CONFIG.A;
              const isExpanded = !!expandedCards[s._id];

              return (
                <div
                  key={s._id}
                  className="card p-5 bg-white border-cream-200 shadow-sm space-y-4 hover:border-gold-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-walnut-900">{s.userName}</span>
                          {idx === 0 && (
                            <span title="Leaderboard #1" className="text-amber-500">
                              <Star className="h-4 w-4 fill-amber-400" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-walnut-500 font-medium">
                          {s.department} • <span className="capitalize">{s.role}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${gradeCfg.tone}`}
                        >
                          {s.grade}
                        </span>
                        <div className="font-display text-lg font-bold text-walnut-900 mt-1">
                          {s.compositeScore} <span className="text-[10px] font-sans font-normal text-walnut-400">/ 100</span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Band Tag */}
                    <div className="p-2 rounded bg-cream-50 border border-cream-100 text-[11px] text-walnut-700 flex items-center justify-between">
                      <span className="font-semibold">{BAND_LABELS[s.performanceBand] || s.performanceBand}</span>
                      <span className="font-mono text-[10px] text-walnut-400">{s.period}</span>
                    </div>

                    {/* Appraisal Notes snippet */}
                    {s.appraisalNotes && (
                      <p className="text-xs text-walnut-600 line-clamp-2 italic">
                        "{s.appraisalNotes}"
                      </p>
                    )}

                    {/* KPI Sliders Drawer */}
                    {isExpanded && s.kpis && s.kpis.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-cream-100">
                        <span className="text-[10px] font-bold text-walnut-700 uppercase tracking-wider block">
                          Weighted KPI Metrics
                        </span>
                        {s.kpis.map((kpi, kIdx) => (
                          <div key={kIdx} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-walnut-800 font-medium">{kpi.kpiName}</span>
                              <span className="font-mono font-bold text-walnut-900">
                                {kpi.score}% <span className="text-[10px] font-normal text-walnut-400">({kpi.weightPct}% wt)</span>
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-cream-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gold-600"
                                style={{ width: `${Math.min(100, kpi.score)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-cream-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => toggleExpand(s._id)}
                      className="text-gold-800 hover:text-gold-950 font-semibold text-[11px] flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Hide KPIs' : 'View KPIs'}</span>
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    <div className="flex items-center gap-1">
                      {isStaff && (
                        <button
                          onClick={() => {
                            setSignOffModalItem(s);
                            setSignOffNotes(s.appraisalNotes || '');
                          }}
                          className="p-1 rounded text-leaf-800 hover:bg-leaf-50"
                          title="Executive Sign-off"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setHistoryModalItem(s)}
                        className="p-1 rounded text-walnut-500 hover:bg-cream-100"
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
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4 text-right">Composite Score</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Performance Band</th>
                  <th className="py-3 px-4">Sign-Off</th>
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
                ) : scores.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-walnut-500">
                      No evaluations found.
                    </td>
                  </tr>
                ) : (
                  scores.map((s) => {
                    const gradeCfg = GRADE_CONFIG[s.grade] || GRADE_CONFIG.A;

                    return (
                      <tr key={s._id} className="hover:bg-cream-50/50">
                        <td className="py-3 px-4 font-mono font-semibold text-gold-800">
                          {s.period}
                        </td>
                        <td className="py-3 px-4 font-semibold text-walnut-900">
                          {s.userName}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-walnut-800">{s.department}</div>
                          <div className="text-[10px] text-walnut-500 capitalize">{s.role}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-display text-base font-bold text-walnut-900">
                          {s.compositeScore} <span className="text-[10px] font-sans font-normal text-walnut-400">/ 100</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${gradeCfg.tone}`}
                          >
                            {s.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-walnut-700 text-[11px]">
                          {BAND_LABELS[s.performanceBand] || s.performanceBand}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-1.5 py-0.2 rounded bg-leaf-100 text-leaf-800 font-semibold uppercase text-[9px]">
                            {s.signOffStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setHistoryModalItem(s)}
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

      {/* MODAL 1: CREATE EVALUATION */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-xl bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  New Monthly MIS Performance Appraisal
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
                  <label className="block font-semibold text-walnut-800 mb-1">Select Employee *</label>
                  <select
                    required
                    value={newEval.userId}
                    onChange={(e) => setNewEval({ ...newEval, userId: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="">Select Employee</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.department} — {u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Appraisal Period *</label>
                  <input
                    type="month"
                    required
                    value={newEval.period}
                    onChange={(e) => setNewEval({ ...newEval, period: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              {/* KPI 1 */}
              <div className="p-3 rounded-lg bg-cream-50 border border-cream-200 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-walnut-800 mb-1">KPI 1 Title</label>
                    <input
                      type="text"
                      value={newEval.kpi1_name}
                      onChange={(e) => setNewEval({ ...newEval, kpi1_name: e.target.value })}
                      className="input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-walnut-800 mb-1">Score (0-100) / Weight%</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newEval.kpi1_score}
                        onChange={(e) => setNewEval({ ...newEval, kpi1_score: e.target.value })}
                        className="input w-full text-xs font-mono"
                      />
                      <input
                        type="number"
                        value={newEval.kpi1_weight}
                        onChange={(e) => setNewEval({ ...newEval, kpi1_weight: e.target.value })}
                        className="input w-16 text-xs font-mono bg-cream-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="p-3 rounded-lg bg-cream-50 border border-cream-200 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-walnut-800 mb-1">KPI 2 Title</label>
                    <input
                      type="text"
                      value={newEval.kpi2_name}
                      onChange={(e) => setNewEval({ ...newEval, kpi2_name: e.target.value })}
                      className="input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-walnut-800 mb-1">Score (0-100) / Weight%</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newEval.kpi2_score}
                        onChange={(e) => setNewEval({ ...newEval, kpi2_score: e.target.value })}
                        className="input w-full text-xs font-mono"
                      />
                      <input
                        type="number"
                        value={newEval.kpi2_weight}
                        onChange={(e) => setNewEval({ ...newEval, kpi2_weight: e.target.value })}
                        className="input w-16 text-xs font-mono bg-cream-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="p-3 rounded-lg bg-cream-50 border border-cream-200 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="md:col-span-2">
                    <label className="block font-semibold text-walnut-800 mb-1">KPI 3 Title</label>
                    <input
                      type="text"
                      value={newEval.kpi3_name}
                      onChange={(e) => setNewEval({ ...newEval, kpi3_name: e.target.value })}
                      className="input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-walnut-800 mb-1">Score (0-100) / Weight%</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newEval.kpi3_score}
                        onChange={(e) => setNewEval({ ...newEval, kpi3_score: e.target.value })}
                        className="input w-full text-xs font-mono"
                      />
                      <input
                        type="number"
                        value={newEval.kpi3_weight}
                        onChange={(e) => setNewEval({ ...newEval, kpi3_weight: e.target.value })}
                        className="input w-16 text-xs font-mono bg-cream-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Executive Appraisal Remarks
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Exceptional accuracy in diamond setting and zero defect hallmarking pass."
                  value={newEval.appraisalNotes}
                  onChange={(e) => setNewEval({ ...newEval, appraisalNotes: e.target.value })}
                  className="input w-full text-xs"
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
                  {create.isPending ? 'Calculating...' : 'Save & Publish Evaluation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EXECUTIVE SIGN-OFF */}
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
                  Executive MIS Sign-Off
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
              <div className="font-semibold text-gold-800">{signOffModalItem.userName}</div>
              <div>
                Department: {signOffModalItem.department} | Score: {signOffModalItem.compositeScore} / 100 ({signOffModalItem.grade})
              </div>
              <div className="text-walnut-600">Period: {signOffModalItem.period}</div>
            </div>

            <form onSubmit={handleSignOffSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Executive Appraisal Endorsement Remarks
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Endorsed for Annual Gold Club Performance Incentive."
                  value={signOffNotes}
                  onChange={(e) => setSignOffNotes(e.target.value)}
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
                  {act.isPending ? 'Endorsing...' : 'Endorse & Approve Score'}
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
                  MIS Performance Audit Trail
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
              <div className="font-semibold text-gold-800">{historyModalItem.userName}</div>
              <div>{historyModalItem.department} — Period {historyModalItem.period}</div>
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
                    By: {step.performedByName || 'Executive'}
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
