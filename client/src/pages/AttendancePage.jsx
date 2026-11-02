import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate } from '../lib.js';
import {
  Fingerprint,
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
  Building2,
  Users,
  Calendar,
  LogOut,
  LogIn,
  ScanFace,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

function fmtTime(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

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

const STATUS_CONFIG = {
  present: { label: 'Present', bg: 'bg-leaf-500/15 text-leaf-800 border-leaf-500/30' },
  late: { label: 'Late Mark', bg: 'bg-amber-500/20 text-amber-900 border-amber-500/40' },
  half_day: { label: 'Half Day', bg: 'bg-gold-500/15 text-gold-800 border-gold-500/30' },
  on_leave: { label: 'On Leave', bg: 'bg-sky-500/15 text-sky-800 border-sky-500/30' },
  absent: { label: 'Absent', bg: 'bg-rose-500/15 text-rose-800 border-rose-500/30' },
};

const SHIFTS = [
  { value: 'general_day', label: 'General Day (09:30 AM – 06:30 PM)' },
  { value: 'karigar_morning', label: 'Karigar Workshop Morning (08:30 AM – 05:30 PM)' },
  { value: 'karigar_evening', label: 'Karigar Workshop Evening (01:00 PM – 10:00 PM)' },
  { value: 'sales_showroom', label: 'Showroom Retail (10:30 AM – 08:00 PM)' },
  { value: 'vault_security', label: 'Vault Armored Security (24x7 Shift)' },
];

export default function AttendancePage() {
  const { user, isStaff } = useAuth();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'heatmap'

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Modals
  const [regularizeModalItem, setRegularizeModalItem] = useState(null);
  const [historyModalItem, setHistoryModalItem] = useState(null);

  const [regularizeForm, setRegularizeForm] = useState({
    punchIn: '',
    punchOut: '',
    status: 'present',
    reason: '',
  });

  const queryParams = useMemo(() => {
    const q = {};
    if (deptFilter) q.department = deptFilter;
    if (statusFilter) q.status = statusFilter;
    if (search) q.search = search;
    return q;
  }, [deptFilter, statusFilter, search]);

  const { data: listData, isLoading } = useList('attendance', queryParams);
  const { data: stats } = useStats('attendance', queryParams);
  const { act } = useResourceMutation('attendance');

  const records = listData?.items || [];

  // Find user's attendance today
  const myRecord = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return records.find((r) => r.userId?._id === user?._id || r.userId === user?._id);
  }, [records, user]);

  const handlePunchIn = () => {
    act.mutate(
      {
        action: 'punch-in',
        body: {
          shift: user?.department === 'Production' ? 'karigar_morning' : 'general_day',
          biometricDeviceId: user?.department === 'Production' ? 'BIO-KARIGAR-WORKSHOP' : 'BIO-GATE-MAIN-01',
        },
      }
    );
  };

  const handlePunchOut = () => {
    act.mutate(
      {
        action: 'punch-out',
        body: {
          vaultClearanceCheck: true,
          remarks: 'Exit body metal detector scan cleared.',
        },
      }
    );
  };

  const handleRegularizeSubmit = (e) => {
    e.preventDefault();
    if (!regularizeModalItem) return;
    act.mutate(
      {
        id: regularizeModalItem._id,
        action: 'regularize',
        body: regularizeForm,
      },
      {
        onSuccess: () => {
          setRegularizeModalItem(null);
          setRegularizeForm({ punchIn: '', punchOut: '', status: 'present', reason: '' });
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!records.length) return;
    const headers = [
      'Employee',
      'Department',
      'Date',
      'Shift',
      'Punch In',
      'Punch Out',
      'Work Hours',
      'Overtime',
      'Status',
      'Vault Scan',
    ];
    const rows = records.map((r) => [
      `"${r.userName}"`,
      r.department,
      r.date ? r.date.slice(0, 10) : '',
      r.shift,
      r.punchIn ? fmtTime(r.punchIn) : '',
      r.punchOut ? fmtTime(r.punchOut) : '',
      r.workHours,
      r.overtimeHours,
      r.status,
      r.vaultClearanceCheck ? 'CLEARED' : 'FLAGGED',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span className="text-gold-700 font-semibold">Attendance</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut-900 sm:text-3xl">
              Biometric Attendance & Security Scans
            </h1>
            <span className="inline-flex items-center rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-gold-800 border border-gold-500/20">
              Biometric Gate v2.4
            </span>
          </div>
          <p className="mt-1 text-xs text-walnut-600">
            Optical & facial biometric punches, Karigar workshop shifts, overtime ledger & body metal detector vault clearances.
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
        </div>
      </div>

      {/* Live Employee Biometric Punch Console */}
      <div className="card p-5 bg-gradient-to-r from-cream-100 via-white to-gold-50/40 border-gold-300 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gold-600 flex items-center justify-center text-white shadow-gold">
              <Fingerprint className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-walnut-900">{user?.name}</span>
                <span className="text-[11px] font-medium text-walnut-500">({user?.department || 'Executive'})</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-walnut-600 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-gold-700" />
                <span className="font-mono font-bold text-walnut-900">
                  {currentTime.toLocaleTimeString()}
                </span>
                <span>•</span>
                <span>Gate: {user?.department === 'Production' ? 'BIO-KARIGAR-WORKSHOP' : 'BIO-GATE-MAIN-01'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!myRecord?.punchIn ? (
              <button
                onClick={handlePunchIn}
                disabled={act.isPending}
                className="btn-primary flex items-center gap-2 py-2 px-4 shadow-gold text-xs font-semibold"
              >
                <LogIn className="h-4 w-4" />
                <span>Biometric Punch In</span>
              </button>
            ) : !myRecord?.punchOut ? (
              <div className="flex items-center gap-2">
                <div className="text-right text-xs">
                  <span className="text-walnut-500 text-[11px]">In: {fmtTime(myRecord.punchIn)}</span>
                  <div className="text-leaf-700 font-semibold flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-leaf-500 animate-pulse" />
                    On Duty
                  </div>
                </div>
                <button
                  onClick={handlePunchOut}
                  disabled={act.isPending}
                  className="btn-ghost flex items-center gap-1.5 py-2 px-3 border border-amber-400 text-amber-900 hover:bg-amber-50 text-xs font-semibold"
                >
                  <LogOut className="h-4 w-4 text-amber-700" />
                  <span>Punch Out & Metal Scan</span>
                </button>
              </div>
            ) : (
              <div className="text-xs text-right">
                <span className="text-[11px] text-walnut-500">Day Completed</span>
                <div className="font-semibold text-leaf-700">
                  {fmtTime(myRecord.punchIn)} – {fmtTime(myRecord.punchOut)} ({myRecord.workHours} hrs)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-leaf-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-leaf-900 uppercase tracking-wider">Presence Rate</span>
            <Users className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-leaf-900">
            {stats?.presenceRate || 0}%
          </div>
          <div className="mt-1 text-[11px] text-leaf-700">Today's active turnout</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-gold-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gold-900 uppercase tracking-wider">Staff Present</span>
            <CheckCircle2 className="h-4 w-4 text-gold-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-walnut-900">
            {stats?.present || 0} <span className="text-xs font-sans font-normal text-walnut-500">/ {stats?.totalStaff || 0}</span>
          </div>
          <div className="mt-1 text-[11px] text-walnut-500">Biometric logged in</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-amber-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Late Arrivals</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-amber-900">
            {stats?.late || 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Past 09:45 AM threshold</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-sky-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-900 uppercase tracking-wider">On Leave</span>
            <Calendar className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-sky-900">
            {stats?.onLeave || 0}
          </div>
          <div className="mt-1 text-[11px] text-sky-700">Approved HR leaves</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-purple-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-900 uppercase tracking-wider">Overtime Logged</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-purple-900">
            {stats?.totalOvertime || 0} <span className="text-xs font-sans font-normal">hrs</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-700">Workshop Karigar extra</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-leaf-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-leaf-900 uppercase tracking-wider">Vault Scans</span>
            <ShieldCheck className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-leaf-900">
            {stats?.vaultClearancePct || 100}%
          </div>
          <div className="mt-1 text-[11px] text-leaf-700">Exit body scan cleared</div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut-400" />
            <input
              type="text"
              placeholder="Search employee name, department, device ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full bg-cream-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Departments</option>
              <option value="Management">Management</option>
              <option value="Production">Production (Karigars)</option>
              <option value="Sales">Sales & Showroom</option>
              <option value="Accounts">Accounts</option>
              <option value="Quality">Quality Control</option>
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
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'table'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                Register Table
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'heatmap'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                Department Heatmap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'table' ? (
        <div className="card overflow-hidden border-cream-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/70 text-walnut-800 uppercase font-semibold text-[11px] tracking-wider border-b border-cream-200">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">Shift & Gate</th>
                  <th className="py-3 px-4 text-center">Punch In</th>
                  <th className="py-3 px-4 text-center">Punch Out</th>
                  <th className="py-3 px-4 text-right">Work Hours</th>
                  <th className="py-3 px-4 text-right">Overtime</th>
                  <th className="py-3 px-4">Vault Scan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-walnut-500">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-walnut-500">
                      No attendance records found for today.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.present;

                    return (
                      <tr key={r._id} className="hover:bg-cream-50/50">
                        <td className="py-3 px-4 font-semibold text-walnut-900">
                          <div>{r.userName}</div>
                          <div className="text-[10px] text-walnut-400 font-normal font-sans">
                            {fmtDate(r.date)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-walnut-800">{r.department}</div>
                          <div className="text-[10px] text-walnut-500">{r.userId?.role || 'Staff'}</div>
                        </td>

                        <td className="py-3 px-4 text-[11px]">
                          <div className="font-mono text-walnut-800">{r.biometricDeviceId}</div>
                          <div className="text-[10px] text-walnut-500 capitalize">{r.shift?.replace('_', ' ')}</div>
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-walnut-900">
                          {r.punchIn ? fmtTime(r.punchIn) : '—'}
                          {r.lateMinutes > 0 && (
                            <div className="text-[10px] text-amber-700 font-sans font-normal">
                              +{r.lateMinutes}m late
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-walnut-900">
                          {r.punchOut ? (
                            fmtTime(r.punchOut)
                          ) : r.punchIn ? (
                            <span className="text-[10px] font-sans font-semibold text-leaf-600 bg-leaf-50 px-1.5 py-0.5 rounded">
                              Live In
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-walnut-900">
                          {r.workHours ? `${r.workHours}h` : '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-purple-800">
                          {r.overtimeHours ? `+${r.overtimeHours}h` : '—'}
                        </td>

                        <td className="py-3 px-4">
                          {r.vaultClearanceCheck ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-leaf-700">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Cleared</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Flagged</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${statusCfg.bg}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isStaff && (
                              <button
                                onClick={() => {
                                  setRegularizeModalItem(r);
                                  setRegularizeForm({
                                    punchIn: r.punchIn ? new Date(r.punchIn).toISOString().slice(0, 16) : '',
                                    punchOut: r.punchOut ? new Date(r.punchOut).toISOString().slice(0, 16) : '',
                                    status: r.status,
                                    reason: r.regularizationReason || '',
                                  });
                                }}
                                className="p-1 rounded text-gold-700 hover:bg-gold-50"
                                title="Regularize Attendance"
                              >
                                <SlidersHorizontal className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => setHistoryModalItem(r)}
                              className="p-1 rounded text-walnut-500 hover:bg-cream-100"
                              title="Audit Trail"
                            >
                              <History className="h-4 w-4" />
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
        /* Department Heatmap Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(
            records.reduce((acc, r) => {
              const dept = r.department || 'General';
              if (!acc[dept]) {
                acc[dept] = { total: 0, present: 0, late: 0, onLeave: 0, overtime: 0 };
              }
              acc[dept].total += 1;
              if (r.status === 'present' || r.status === 'late' || r.status === 'half_day') {
                acc[dept].present += 1;
              }
              if (r.status === 'late') acc[dept].late += 1;
              if (r.status === 'on_leave') acc[dept].onLeave += 1;
              acc[dept].overtime += r.overtimeHours || 0;
              return acc;
            }, {})
          ).map(([dept, d]) => {
            const pct = d.total > 0 ? Math.round((d.present / d.total) * 100) : 0;
            return (
              <div key={dept} className="card p-5 bg-white border-cream-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-walnut-900 text-sm">{dept}</h3>
                  <span className="font-mono text-xs font-bold text-leaf-700 bg-leaf-50 px-2 py-0.5 rounded border border-leaf-200">
                    {pct}% Present
                  </span>
                </div>

                <div className="h-2 w-full bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-leaf-600 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-cream-100 text-center text-xs">
                  <div>
                    <div className="text-walnut-500 text-[10px]">Present</div>
                    <div className="font-bold text-leaf-800 font-mono">{d.present} / {d.total}</div>
                  </div>
                  <div>
                    <div className="text-walnut-500 text-[10px]">Late</div>
                    <div className="font-bold text-amber-800 font-mono">{d.late}</div>
                  </div>
                  <div>
                    <div className="text-walnut-500 text-[10px]">Overtime</div>
                    <div className="font-bold text-purple-800 font-mono">+{d.overtime.toFixed(1)}h</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: REGULARIZE ATTENDANCE */}
      {regularizeModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Regularize Employee Punch
                </h3>
              </div>
              <button
                onClick={() => setRegularizeModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800 space-y-1">
              <div className="font-semibold text-gold-800">{regularizeModalItem.userName}</div>
              <div>Department: {regularizeModalItem.department}</div>
              <div className="text-walnut-600">Date: {fmtDate(regularizeModalItem.date)}</div>
            </div>

            <form onSubmit={handleRegularizeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Adjusted Punch In</label>
                  <input
                    type="datetime-local"
                    value={regularizeForm.punchIn}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, punchIn: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Adjusted Punch Out</label>
                  <input
                    type="datetime-local"
                    value={regularizeForm.punchOut}
                    onChange={(e) => setRegularizeForm({ ...regularizeForm, punchOut: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Attendance Status</label>
                <select
                  value={regularizeForm.status}
                  onChange={(e) => setRegularizeForm({ ...regularizeForm, status: e.target.value })}
                  className="input w-full text-xs"
                >
                  <option value="present">Present (Cleared)</option>
                  <option value="late">Late Mark</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Manager Regularization Reason *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Employee was deployed at client salon preview in Doha. Punch manually authenticated."
                  value={regularizeForm.reason}
                  onChange={(e) => setRegularizeForm({ ...regularizeForm, reason: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setRegularizeModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary text-xs shadow-gold bg-leaf-700 hover:bg-leaf-800 text-white"
                >
                  {act.isPending ? 'Saving...' : 'Apply Regularization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AUDIT TRAIL */}
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
                  Biometric Punch Audit Trail
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
              <div>{historyModalItem.department} — {fmtDate(historyModalItem.date)}</div>
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
                    By: {step.performedByName || 'Biometric Scanner'}
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
