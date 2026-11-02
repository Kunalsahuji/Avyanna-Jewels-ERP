import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate } from '../lib.js';
import {
  Sparkles,
  Gem,
  Coins,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Plus,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Scale,
  History,
  Truck,
  Building2,
  Calendar,
  MapPin,
  TrendingUp,
  Receipt,
  Layers,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function fmtINR(amount) {
  if (amount === undefined || amount === null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
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
  planning: { label: 'Planning', bg: 'bg-cream-200 text-walnut-700 border-cream-300' },
  stock_allocated: { label: 'Stock Allocated', bg: 'bg-gold-500/15 text-gold-800 border-gold-500/30' },
  in_transit: { label: 'Armored Transit', bg: 'bg-sky-500/15 text-sky-800 border-sky-500/30' },
  live_exhibition: { label: 'Live Showcase', bg: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30' },
  reconciliation: { label: 'Reconciliation', bg: 'bg-amber-500/20 text-amber-900 border-amber-500/40' },
  closed: { label: 'Closed & Vaulted', bg: 'bg-slate-500/15 text-slate-800 border-slate-500/30' },
};

export default function ExhibitionFmsPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [expandedEvents, setExpandedEvents] = useState({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [allocateModalItem, setAllocateModalItem] = useState(null);
  const [saleModalItem, setSaleModalItem] = useState(null);
  const [reconcileModalItem, setReconcileModalItem] = useState(null);
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Forms
  const [newEvent, setNewEvent] = useState({
    title: '',
    city: '',
    venue: '',
    boothNumber: '',
    startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
    salesTarget: '',
    transitInsurancePolicy: '',
    securityCarrier: 'BVC Logistics Armored Transit',
    leadManager: '',
  });

  const [allocateForm, setAllocateForm] = useState({
    parcelNumber: '',
    title: '',
    category: 'necklace',
    purity: '18K (750)',
    grossWeight: '',
    diamondWeight: '',
    tagPrice: '',
  });

  const [saleForm, setSaleForm] = useState({
    itemId: '',
    customerName: '',
    saleAmount: '',
    invoiceNumber: '',
  });

  const [reconcileNotes, setReconcileNotes] = useState('');

  const { data: users = [] } = useUsers();
  const managers = useMemo(
    () => users.filter((u) => u.role === 'admin' || u.role === 'manager'),
    [users]
  );

  const queryParams = useMemo(() => {
    const q = {};
    if (statusFilter) q.status = statusFilter;
    if (cityFilter) q.city = cityFilter;
    if (search) q.search = search;
    return q;
  }, [statusFilter, cityFilter, search]);

  const { data: listData, isLoading } = useList('exhibition', queryParams);
  const { data: stats } = useStats('exhibition', queryParams);
  const { create, act } = useResourceMutation('exhibition');

  const exhibitions = listData?.items || [];

  const toggleExpand = (id) => {
    setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Submit Handlers
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    create.mutate(
      {
        ...newEvent,
        salesTarget: Number(newEvent.salesTarget || 0),
        leadManager: newEvent.leadManager || user?._id || user?.id,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewEvent({
            title: '',
            city: '',
            venue: '',
            boothNumber: '',
            startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
            endDate: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10),
            salesTarget: '',
            transitInsurancePolicy: '',
            securityCarrier: 'BVC Logistics Armored Transit',
            leadManager: '',
          });
        },
      }
    );
  };

  const handleAllocateSubmit = (e) => {
    e.preventDefault();
    if (!allocateModalItem) return;
    act.mutate(
      {
        id: allocateModalItem._id,
        action: 'allocate-stock',
        body: {
          items: [
            {
              ...allocateForm,
              grossWeight: Number(allocateForm.grossWeight),
              diamondWeight: Number(allocateForm.diamondWeight || 0),
              tagPrice: Number(allocateForm.tagPrice),
            },
          ],
        },
      },
      {
        onSuccess: () => {
          setAllocateModalItem(null);
          setAllocateForm({
            parcelNumber: '',
            title: '',
            category: 'necklace',
            purity: '18K (750)',
            grossWeight: '',
            diamondWeight: '',
            tagPrice: '',
          });
        },
      }
    );
  };

  const handleSaleSubmit = (e) => {
    e.preventDefault();
    if (!saleModalItem || !saleForm.itemId) return;
    act.mutate(
      {
        id: saleModalItem._id,
        action: 'record-sale',
        body: saleForm,
      },
      {
        onSuccess: () => {
          setSaleModalItem(null);
          setSaleForm({ itemId: '', customerName: '', saleAmount: '', invoiceNumber: '' });
        },
      }
    );
  };

  const handleReconcileSubmit = (e) => {
    e.preventDefault();
    if (!reconcileModalItem) return;
    act.mutate(
      {
        id: reconcileModalItem._id,
        action: 'reconcile',
        body: { notes: reconcileNotes },
      },
      {
        onSuccess: () => {
          setReconcileModalItem(null);
          setReconcileNotes('');
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!exhibitions.length) return;
    const headers = [
      'Event Code',
      'Exhibition Title',
      'City',
      'Venue',
      'Booth',
      'Start Date',
      'End Date',
      'Status',
      'Target (INR)',
      'Sales Achieved (INR)',
      'Allocated Pieces',
      'Allocated Value (INR)',
    ];
    const rows = exhibitions.map((ex) => [
      ex.eventCode,
      `"${ex.title}"`,
      `"${ex.city}"`,
      `"${ex.venue}"`,
      `"${ex.boothNumber}"`,
      ex.startDate ? ex.startDate.slice(0, 10) : '',
      ex.endDate ? ex.endDate.slice(0, 10) : '',
      ex.status,
      ex.salesTarget,
      ex.totalSalesAchieved,
      ex.allocatedPieces,
      ex.allocatedStockValue,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Exhibitions_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span className="text-gold-700 font-semibold">Exhibition FMS</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut-900 sm:text-3xl">
              Exhibition FMS & Showcase Allocations
            </h1>
            <span className="inline-flex items-center rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-gold-800 border border-gold-500/20">
              High Jewelry Events
            </span>
          </div>
          <p className="mt-1 text-xs text-walnut-600">
            International jewelry expo bookings, high-value booth allocations, spot sales tallies & armored return reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn-ghost flex items-center gap-1.5 text-xs font-medium text-walnut-700 border border-cream-300 bg-white shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export Manifest</span>
          </button>
          {isStaff && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs font-semibold shadow-gold"
            >
              <Plus className="h-4 w-4" />
              <span>Book New Exhibition</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-gold-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700 uppercase tracking-wider">Showcase Value</span>
            <Sparkles className="h-4 w-4 text-gold-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-walnut-900">
            {fmtINR(stats?.totalAllocatedValue || 0)}
          </div>
          <div className="mt-1 text-[11px] text-walnut-500">Allocated high jewelry</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-emerald-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Event Sales</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-emerald-900">
            {fmtINR(stats?.totalSales || 0)}
          </div>
          <div className="mt-1 text-[11px] text-emerald-700">Gross spot bookings</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-gold-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gold-900 uppercase tracking-wider">Target Attained</span>
            <Receipt className="h-4 w-4 text-gold-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-gold-900">
            {stats?.targetProgress || 0}%
          </div>
          <div className="mt-1 text-[11px] text-gold-700">Of ₹{(stats?.totalSalesTarget ? stats.totalSalesTarget / 10000000 : 0).toFixed(1)} Cr target</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-sky-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider">Pieces Sold</span>
            <ShoppingBag className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-sky-900">
            {stats?.totalPiecesSold || 0}
          </div>
          <div className="mt-1 text-[11px] text-sky-700">Showcase pieces acquired</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-amber-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Gold in Transit</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-amber-900">
            {(stats?.totalGrossGoldWeight || 0).toLocaleString()} <span className="text-xs font-sans font-normal">g</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Secured with armored carriers</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-leaf-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-leaf-800 uppercase tracking-wider">Live & Active</span>
            <Calendar className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-leaf-900">
            {(stats?.liveNow || 0) + (stats?.upcoming || 0)}
          </div>
          <div className="mt-1 text-[11px] text-leaf-700">Scheduled showcases</div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut-400" />
            <input
              type="text"
              placeholder="Search event title, code, city, venue, booth # or carrier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full bg-cream-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Cities</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Doha">Doha</option>
              <option value="Jaipur">Jaipur</option>
              <option value="Vicenza">Vicenza</option>
              <option value="Delhi">Delhi</option>
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
                Showcase Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'table'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                Registry Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'cards' ? (
        <div className="space-y-4">
          {isLoading ? (
            <div className="card p-12 text-center text-xs text-walnut-500 bg-white">
              Loading exhibition showcases...
            </div>
          ) : exhibitions.length === 0 ? (
            <div className="card p-12 text-center text-xs text-walnut-500 bg-white">
              No exhibitions found matching criteria.
            </div>
          ) : (
            exhibitions.map((ex) => {
              const statusCfg = STATUS_CONFIG[ex.status] || STATUS_CONFIG.planning;
              const isExpanded = !!expandedEvents[ex._id];
              const progressPct =
                ex.salesTarget > 0
                  ? Math.min(100, Math.round((ex.totalSalesAchieved / ex.salesTarget) * 100))
                  : 0;

              return (
                <div key={ex._id} className="card bg-white border-cream-200 overflow-hidden shadow-sm">
                  {/* Card Header Banner */}
                  <div className="p-5 border-b border-cream-100 bg-gradient-to-r from-cream-50/70 via-white to-gold-50/20">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gold-800 bg-gold-500/10 px-2 py-0.5 rounded border border-gold-500/20">
                            {ex.eventCode}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${statusCfg.bg}`}
                          >
                            {statusCfg.label}
                          </span>
                        </div>
                        <h2 className="font-display text-lg font-semibold text-walnut-900 mt-1">
                          {ex.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-walnut-600 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-gold-600" />
                            {ex.venue}, {ex.city} ({ex.boothNumber})
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-walnut-400" />
                            {fmtDate(ex.startDate)} – {fmtDate(ex.endDate)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-walnut-700 font-medium">
                            <Truck className="h-3.5 w-3.5 text-sky-600" />
                            {ex.securityCarrier}
                          </span>
                        </div>
                      </div>

                      {/* Top Action Tray */}
                      <div className="flex items-center gap-2">
                        {isStaff && ex.status !== 'closed' && (
                          <button
                            onClick={() => {
                              setAllocateModalItem(ex);
                              setAllocateForm({
                                parcelNumber: `EX-ITM-${String((ex.allocatedItems?.length || 0) + 1).padStart(3, '0')}`,
                                title: '',
                                category: 'necklace',
                                purity: '18K (750)',
                                grossWeight: '',
                                diamondWeight: '',
                                tagPrice: '',
                              });
                            }}
                            className="btn-ghost flex items-center gap-1 text-xs border border-gold-300 text-gold-900 hover:bg-gold-50"
                          >
                            <Plus className="h-3.5 w-3.5 text-gold-700" />
                            <span>Allocate Stock</span>
                          </button>
                        )}

                        {isStaff && (ex.status === 'live_exhibition' || ex.status === 'stock_allocated') && (
                          <button
                            onClick={() => {
                              setSaleModalItem(ex);
                              const firstDisplay = ex.allocatedItems?.find((i) => i.status === 'on_display' || i.status === 'allocated');
                              setSaleForm({
                                itemId: firstDisplay?._id || '',
                                customerName: '',
                                saleAmount: firstDisplay?.tagPrice || '',
                                invoiceNumber: `INV-${ex.city.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-4)}`,
                              });
                            }}
                            className="btn-primary flex items-center gap-1 text-xs shadow-gold bg-emerald-700 hover:bg-emerald-800"
                          >
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span>Record Sale</span>
                          </button>
                        )}

                        {isStaff && ex.status !== 'closed' && (
                          <button
                            onClick={() => {
                              setReconcileModalItem(ex);
                              setReconcileNotes('');
                            }}
                            className="btn-ghost text-xs text-amber-900 border border-amber-300 hover:bg-amber-50"
                          >
                            <span>Reconcile & Close</span>
                          </button>
                        )}

                        <button
                          onClick={() => setHistoryModalItem(ex)}
                          className="p-1.5 rounded text-walnut-600 hover:bg-cream-100 transition-colors"
                          title="Event Audit Trail"
                        >
                          <History className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => toggleExpand(ex._id)}
                          className="p-1.5 rounded text-walnut-600 hover:bg-cream-100 transition-colors"
                          title={isExpanded ? 'Collapse Showcase Items' : 'View Showcase Items'}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar & Key Numbers */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-cream-100 text-xs">
                      <div>
                        <span className="text-walnut-500 text-[11px]">Allocated Showcase Stock</span>
                        <div className="font-bold text-walnut-900 font-mono text-sm mt-0.5">
                          {fmtINR(ex.allocatedStockValue)}
                        </div>
                        <div className="text-[10px] text-walnut-500 font-sans">
                          {ex.allocatedPieces} pcs ({ex.allocatedWeight}g gold, {ex.allocatedDiamondsCarats} cts dia)
                        </div>
                      </div>

                      <div>
                        <span className="text-walnut-500 text-[11px]">Sales Target</span>
                        <div className="font-bold text-walnut-900 font-mono text-sm mt-0.5">
                          {fmtINR(ex.salesTarget)}
                        </div>
                        <div className="text-[10px] text-walnut-500 font-sans">
                          Lead: {ex.leadManager?.name || 'Assigned'}
                        </div>
                      </div>

                      <div>
                        <span className="text-emerald-800 text-[11px] font-semibold">Sales Achieved</span>
                        <div className="font-bold text-emerald-900 font-mono text-sm mt-0.5">
                          {fmtINR(ex.totalSalesAchieved)}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-sans">
                          {ex.totalPiecesSold} pieces sold
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-walnut-600 font-semibold">Target Progress</span>
                          <span className="font-bold text-walnut-900">{progressPct}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-cream-200 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progressPct >= 100 ? 'bg-emerald-600' : 'bg-gold-600'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Drawer */}
                  {isExpanded && (
                    <div className="p-4 bg-cream-50/40 border-t border-cream-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-xs text-walnut-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-gold-700" />
                          <span>Showcase Inventory Manifest ({ex.allocatedItems?.length || 0} items)</span>
                        </h3>
                        {ex.transitInsurancePolicy && (
                          <span className="text-[11px] font-mono text-walnut-500">
                            Insurance: {ex.transitInsurancePolicy}
                          </span>
                        )}
                      </div>

                      {ex.allocatedItems && ex.allocatedItems.length > 0 ? (
                        <div className="overflow-x-auto rounded border border-cream-200 bg-white">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-cream-100/70 text-walnut-800 uppercase font-semibold text-[10px] tracking-wider border-b border-cream-200">
                              <tr>
                                <th className="py-2.5 px-3">Tag / Parcel #</th>
                                <th className="py-2.5 px-3">Item Description</th>
                                <th className="py-2.5 px-3">Category & Purity</th>
                                <th className="py-2.5 px-3 text-right">Gold Wt</th>
                                <th className="py-2.5 px-3 text-right">Diamond Wt</th>
                                <th className="py-2.5 px-3 text-right">Tag Price</th>
                                <th className="py-2.5 px-3">Status / Buyer</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-cream-100">
                              {ex.allocatedItems.map((item) => (
                                <tr key={item._id} className="hover:bg-cream-50/50">
                                  <td className="py-2 px-3 font-mono font-semibold text-gold-800">
                                    {item.parcelNumber}
                                  </td>
                                  <td className="py-2 px-3 font-medium text-walnut-900">
                                    {item.title}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span className="capitalize">{item.category}</span>
                                    <span className="text-walnut-400 mx-1">|</span>
                                    <span className="text-walnut-600">{item.purity}</span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-walnut-800">
                                    {item.grossWeight}g
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono text-walnut-800">
                                    {item.diamondWeight ? `${item.diamondWeight} cts` : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-walnut-900">
                                    {fmtINR(item.tagPrice)}
                                  </td>
                                  <td className="py-2 px-3">
                                    {item.status === 'sold' ? (
                                      <div className="text-[11px]">
                                        <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold uppercase text-[9px]">
                                          Sold ({fmtINR(item.soldAmount)})
                                        </span>
                                        <div className="text-[10px] text-walnut-600 mt-0.5 line-clamp-1">
                                          {item.soldToCustomer}
                                        </div>
                                      </div>
                                    ) : item.status === 'returned_to_vault' ? (
                                      <span className="inline-block px-1.5 py-0.2 rounded bg-cream-200 text-walnut-700 font-semibold uppercase text-[9px]">
                                        Returned Vault
                                      </span>
                                    ) : (
                                      <span className="inline-block px-1.5 py-0.2 rounded bg-gold-100 text-gold-800 font-semibold uppercase text-[9px]">
                                        On Display
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-walnut-500 bg-white rounded border border-cream-200">
                          No jewelry pieces allocated yet. Click "Allocate Stock" above to assemble showcase trays.
                        </div>
                      )}
                    </div>
                  )}
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
                  <th className="py-3 px-4">Event Code</th>
                  <th className="py-3 px-4">Exhibition Title & City</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4 text-right">Allocated Value</th>
                  <th className="py-3 px-4 text-right">Sales Target</th>
                  <th className="py-3 px-4 text-right">Achieved</th>
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
                ) : exhibitions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-walnut-500">
                      No exhibitions found.
                    </td>
                  </tr>
                ) : (
                  exhibitions.map((ex) => {
                    const statusCfg = STATUS_CONFIG[ex.status] || STATUS_CONFIG.planning;
                    return (
                      <tr key={ex._id} className="hover:bg-cream-50/50">
                        <td className="py-3 px-4 font-mono font-semibold text-gold-800">
                          {ex.eventCode}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-walnut-900">{ex.title}</div>
                          <div className="text-[11px] text-walnut-500">
                            {ex.venue}, {ex.city} ({ex.boothNumber})
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-walnut-600">
                          {fmtDate(ex.startDate)} – {fmtDate(ex.endDate)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-walnut-900">
                          {fmtINR(ex.allocatedStockValue)}
                          <div className="text-[10px] font-sans font-normal text-walnut-400">
                            {ex.allocatedPieces} pcs
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-walnut-800">
                          {fmtINR(ex.salesTarget)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                          {fmtINR(ex.totalSalesAchieved)}
                          <div className="text-[10px] font-sans font-normal text-emerald-600">
                            {ex.totalPiecesSold} sold
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${statusCfg.bg}`}
                          >
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setHistoryModalItem(ex)}
                            className="p-1 rounded text-walnut-600 hover:bg-cream-200"
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

      {/* MODAL 1: BOOK NEW EXHIBITION */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-2xl bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Book New Jewelry Exhibition Showcase
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
                  <label className="block font-semibold text-walnut-800 mb-1">Exhibition Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. IIJS Signature 2027 Mumbai"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai, Doha, Jaipur"
                    value={newEvent.city}
                    onChange={(e) => setNewEvent({ ...newEvent, city: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Convention Venue *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jio World Convention Centre, BKC"
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Booth / Stall # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hall 3, Stall #3B-112"
                    value={newEvent.boothNumber}
                    onChange={(e) => setNewEvent({ ...newEvent, boothNumber: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.startDate}
                    onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newEvent.endDate}
                    onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Sales Target (₹)</label>
                  <input
                    type="number"
                    step="100000"
                    placeholder="e.g. 50000000 (5 Cr)"
                    value={newEvent.salesTarget}
                    onChange={(e) => setNewEvent({ ...newEvent, salesTarget: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Lead Manager</label>
                  <select
                    value={newEvent.leadManager}
                    onChange={(e) => setNewEvent({ ...newEvent, leadManager: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="">Select Lead Officer</option>
                    {managers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name} ({m.department || m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Transit Security Carrier</label>
                  <input
                    type="text"
                    value={newEvent.securityCarrier}
                    onChange={(e) => setNewEvent({ ...newEvent, securityCarrier: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Transit Insurance Policy</label>
                  <input
                    type="text"
                    placeholder="e.g. ICICI-LOMBARD-JEW-2026-99081"
                    value={newEvent.transitInsurancePolicy}
                    onChange={(e) => setNewEvent({ ...newEvent, transitInsurancePolicy: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-cream-200">
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
                  {create.isPending ? 'Booking...' : 'Confirm Exhibition Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ALLOCATE STOCK TO EXHIBITION */}
      {allocateModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-lg bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Allocate High Jewelry Piece
                </h3>
              </div>
              <button
                onClick={() => setAllocateModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800">
              <span className="font-semibold text-gold-800">{allocateModalItem.eventCode}</span> —{' '}
              {allocateModalItem.title} ({allocateModalItem.city})
            </div>

            <form onSubmit={handleAllocateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Tag / Parcel # *</label>
                  <input
                    type="text"
                    required
                    value={allocateForm.parcelNumber}
                    onChange={(e) => setAllocateForm({ ...allocateForm, parcelNumber: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Category *</label>
                  <select
                    value={allocateForm.category}
                    onChange={(e) => setAllocateForm({ ...allocateForm, category: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="necklace">Necklace</option>
                    <option value="bridal_set">Bridal Set</option>
                    <option value="ring">Ring</option>
                    <option value="bangle">Bangle</option>
                    <option value="earring">Earring</option>
                    <option value="bracelet">Bracelet</option>
                    <option value="pendant">Pendant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Jewelry Piece Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Basra Pearl & Diamond Choker"
                  value={allocateForm.title}
                  onChange={(e) => setAllocateForm({ ...allocateForm, title: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Purity Grade *</label>
                  <input
                    type="text"
                    required
                    placeholder="18K (750)"
                    value={allocateForm.purity}
                    onChange={(e) => setAllocateForm({ ...allocateForm, purity: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Gross Wt (g) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="85.5"
                    value={allocateForm.grossWeight}
                    onChange={(e) => setAllocateForm({ ...allocateForm, grossWeight: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Dia Wt (cts)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="12.4"
                    value={allocateForm.diamondWeight}
                    onChange={(e) => setAllocateForm({ ...allocateForm, diamondWeight: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Tag Price (₹) *</label>
                <input
                  type="number"
                  step="1000"
                  required
                  placeholder="e.g. 6500000"
                  value={allocateForm.tagPrice}
                  onChange={(e) => setAllocateForm({ ...allocateForm, tagPrice: e.target.value })}
                  className="input w-full text-xs font-mono font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setAllocateModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary text-xs shadow-gold"
                >
                  {act.isPending ? 'Allocating...' : 'Add to Showcase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECORD SPOT SALE */}
      {saleModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-lg bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Record Exhibition Spot Sale
                </h3>
              </div>
              <button
                onClick={() => setSaleModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800">
              <span className="font-semibold text-gold-800">{saleModalItem.eventCode}</span> —{' '}
              {saleModalItem.title}
            </div>

            <form onSubmit={handleSaleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Select Showcase Jewelry Piece *
                </label>
                <select
                  required
                  value={saleForm.itemId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const itm = saleModalItem.allocatedItems?.find((i) => i._id === selId);
                    setSaleForm({
                      ...saleForm,
                      itemId: selId,
                      saleAmount: itm?.tagPrice || '',
                    });
                  }}
                  className="input w-full text-xs"
                >
                  <option value="">Select Item</option>
                  {(saleModalItem.allocatedItems || [])
                    .filter((i) => i.status === 'on_display' || i.status === 'allocated')
                    .map((i) => (
                      <option key={i._id} value={i._id}>
                        [{i.parcelNumber}] {i.title} - {fmtINR(i.tagPrice)}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Customer / VIP Buyer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mrs. Priya Singhania"
                  value={saleForm.customerName}
                  onChange={(e) => setSaleForm({ ...saleForm, customerName: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Agreed Sale Price (₹) *</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={saleForm.saleAmount}
                    onChange={(e) => setSaleForm({ ...saleForm, saleAmount: e.target.value })}
                    className="input w-full text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Event Invoice #</label>
                  <input
                    type="text"
                    value={saleForm.invoiceNumber}
                    onChange={(e) => setSaleForm({ ...saleForm, invoiceNumber: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setSaleModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary text-xs shadow-gold bg-emerald-700 hover:bg-emerald-800"
                >
                  {act.isPending ? 'Logging Sale...' : 'Confirm Sale Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECONCILE AND CLOSE */}
      {reconcileModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Event Reconciliation & Vault Return
                </h3>
              </div>
              <button
                onClick={() => setReconcileModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800 space-y-1">
              <div className="font-semibold text-gold-800">{reconcileModalItem.title}</div>
              <div>Sales: {fmtINR(reconcileModalItem.totalSalesAchieved)} ({reconcileModalItem.totalPiecesSold} pieces)</div>
              <div className="text-walnut-600">
                Unsold items returning to Central Vault: {reconcileModalItem.allocatedPieces - reconcileModalItem.totalPiecesSold} pieces
              </div>
            </div>

            <form onSubmit={handleReconcileSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Manager Reconciliation & Inward Scale Verification Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. All unsold jewelry pieces weighed on calibrated scale upon arrival. Zero variance. Checked into Safe B-2."
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setReconcileModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary text-xs shadow-gold bg-amber-700 hover:bg-amber-800"
                >
                  {act.isPending ? 'Closing...' : 'Close Event & Return to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: AUDIT TRAIL */}
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
                  Event Timeline & Security Trail
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
              <div className="font-semibold text-gold-800">{historyModalItem.eventCode}</div>
              <div>{historyModalItem.title} ({historyModalItem.city})</div>
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
