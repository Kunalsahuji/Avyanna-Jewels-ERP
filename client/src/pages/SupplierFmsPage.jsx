import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate } from '../lib.js';
import {
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
  FileCheck2,
  FileSpreadsheet,
  BadgeAlert,
  ArrowRight,
  TrendingUp,
  ReceiptText,
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

const ITEM_TYPES = [
  { value: 'bullion_gold', label: 'Gold Bullion (24K/22K)', icon: Coins, tone: 'text-amber-700 bg-amber-500/15 border-amber-500/30' },
  { value: 'bullion_silver', label: 'Silver Bullion (999)', icon: Coins, tone: 'text-slate-700 bg-slate-500/15 border-slate-500/30' },
  { value: 'loose_diamonds', label: 'Loose Diamonds (VVS/VS)', icon: Gem, tone: 'text-sky-700 bg-sky-500/15 border-sky-500/30' },
  { value: 'colored_gemstones', label: 'Precious Gemstones', icon: Gem, tone: 'text-emerald-700 bg-emerald-500/15 border-emerald-500/30' },
  { value: 'findings_alloys', label: 'Findings & Master Alloys', icon: Building2, tone: 'text-purple-700 bg-purple-500/15 border-purple-500/30' },
];

const ITEM_TYPE_MAP = Object.fromEntries(ITEM_TYPES.map((t) => [t.value, t]));

const STATUS_CONFIG = {
  draft: { label: 'Draft PO', bg: 'bg-cream-200 text-walnut-700 border-cream-300' },
  ordered: { label: 'PO Placed', bg: 'bg-gold-500/15 text-gold-800 border-gold-500/30' },
  in_transit: { label: 'In Transit', bg: 'bg-sky-500/15 text-sky-800 border-sky-500/30' },
  received_testing: { label: 'Assay Testing', bg: 'bg-amber-500/20 text-amber-900 border-amber-500/40' },
  approved: { label: 'Vaulted & Approved', bg: 'bg-leaf-500/15 text-leaf-800 border-leaf-500/30' },
  rejected: { label: 'Rejected / Returned', bg: 'bg-rose-500/15 text-rose-800 border-rose-500/30' },
};

export default function SupplierFmsPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [viewMode, setViewMode] = useState('orders'); // 'orders' or 'vendors'

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assayModalItem, setAssayModalItem] = useState(null);
  const [approveModalItem, setApproveModalItem] = useState(null);
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Form states
  const [newOrder, setNewOrder] = useState({
    supplierName: '',
    supplierContact: '',
    gstin: '',
    itemType: 'bullion_gold',
    description: '',
    purity: '24K (999.9)',
    quantityOrWeight: '',
    unit: 'grams',
    ratePerUnit: '',
    taxRate: 3,
    paymentTerms: 'immediate',
    deliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    invoiceNumber: '',
  });

  const [assayForm, setAssayForm] = useState({
    testedWeight: '',
    assayTestedPurity: '',
    findings: '',
  });

  const [approvalNotes, setApprovalNotes] = useState('');

  const queryParams = useMemo(() => {
    const q = {};
    if (itemTypeFilter) q.itemType = itemTypeFilter;
    if (statusFilter) q.status = statusFilter;
    if (paymentFilter) q.paymentStatus = paymentFilter;
    if (search) q.search = search;
    return q;
  }, [itemTypeFilter, statusFilter, paymentFilter, search]);

  const { data: listData, isLoading } = useList('supplier', queryParams);
  const { data: stats } = useStats('supplier', queryParams);
  const { create, act } = useResourceMutation('supplier');

  const orders = listData?.items || [];

  // Handlers
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    create.mutate(
      {
        ...newOrder,
        quantityOrWeight: Number(newOrder.quantityOrWeight),
        ratePerUnit: Number(newOrder.ratePerUnit),
        taxRate: Number(newOrder.taxRate),
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewOrder({
            supplierName: '',
            supplierContact: '',
            gstin: '',
            itemType: 'bullion_gold',
            description: '',
            purity: '24K (999.9)',
            quantityOrWeight: '',
            unit: 'grams',
            ratePerUnit: '',
            taxRate: 3,
            paymentTerms: 'immediate',
            deliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
            invoiceNumber: '',
          });
        },
      }
    );
  };

  const handleAssaySubmit = (e) => {
    e.preventDefault();
    if (!assayModalItem) return;
    act.mutate(
      {
        id: assayModalItem._id,
        action: 'assay',
        body: assayForm,
      },
      {
        onSuccess: () => {
          setAssayModalItem(null);
          setAssayForm({ testedWeight: '', assayTestedPurity: '', findings: '' });
        },
      }
    );
  };

  const handleApproveSubmit = (e) => {
    e.preventDefault();
    if (!approveModalItem) return;
    act.mutate(
      {
        id: approveModalItem._id,
        action: 'approve',
        body: { notes: approvalNotes },
      },
      {
        onSuccess: () => {
          setApproveModalItem(null);
          setApprovalNotes('');
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!orders.length) return;
    const headers = ['Order Number', 'Supplier', 'Material Type', 'Purity', 'Weight/Qty', 'Unit', 'Rate', 'Grand Total', 'Status', 'Payment'];
    const rows = orders.map((o) => [
      o.orderNumber,
      `"${o.supplierName}"`,
      o.itemType,
      `"${o.purity}"`,
      o.quantityOrWeight,
      o.unit,
      o.ratePerUnit,
      o.grandTotal,
      o.status,
      o.paymentStatus,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Supplier_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span className="text-gold-700 font-semibold">Supplier FMS</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut-900 sm:text-3xl">
              Supplier FMS & Bullion Inward
            </h1>
            <span className="inline-flex items-center rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-gold-800 border border-gold-500/20">
              Assay & Procurement
            </span>
          </div>
          <p className="mt-1 text-xs text-walnut-600">
            Raw bullion procurement, loose gemstone assay testing, LBMA spot hedge & maker-checker vault receipt.
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
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* 6 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-gold-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700 uppercase tracking-wider">Total Spend</span>
            <Coins className="h-4 w-4 text-gold-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-walnut-900">
            {fmtINR(stats?.totalSpend || 0)}
          </div>
          <div className="mt-1 text-[11px] text-walnut-500">Gross Bullion & Gem Value</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-amber-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">24K Fine Gold</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-amber-900">
            {(stats?.totalGoldGrams || 0).toLocaleString()} <span className="text-xs font-sans font-normal">g</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700">Procured bullion stock</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-sky-50/20 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-800 uppercase tracking-wider">Natural Diamonds</span>
            <Gem className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-sky-900">
            {(stats?.totalDiamondsCarats || 0).toLocaleString()} <span className="text-xs font-sans font-normal">cts</span>
          </div>
          <div className="mt-1 text-[11px] text-sky-700">Certified loose parcels</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-amber-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Assay Testing</span>
            <Scale className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-amber-800">
            {stats?.receivedTesting || 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-600">Pending lab purity check</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-sky-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-900 uppercase tracking-wider">In Transit</span>
            <Truck className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-sky-800">
            {stats?.inTransit || 0}
          </div>
          <div className="mt-1 text-[11px] text-sky-600">Armored carrier shipments</div>
        </div>

        <div className="card p-4 bg-gradient-to-br from-cream-50 via-white to-leaf-50/30 border-cream-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-leaf-900 uppercase tracking-wider">Vaulted Stock</span>
            <ShieldCheck className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-2 font-display text-xl font-bold text-leaf-800">
            {stats?.approved || 0}
          </div>
          <div className="mt-1 text-[11px] text-leaf-600">Maker-checker approved</div>
        </div>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut-400" />
            <input
              type="text"
              placeholder="Search PO number, supplier, GSTIN, invoice or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full bg-cream-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Materials</option>
              {ITEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
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

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Payments</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="fully_paid">Fully Paid</option>
            </select>

            <div className="flex rounded-md border border-cream-300 p-0.5 bg-cream-100/50">
              <button
                onClick={() => setViewMode('orders')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'orders'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                PO Registry
              </button>
              <button
                onClick={() => setViewMode('vendors')}
                className={`px-3 py-1 text-xs font-semibold rounded ${
                  viewMode === 'vendors'
                    ? 'bg-walnut-900 text-cream-50 shadow-sm'
                    : 'text-walnut-700 hover:text-walnut-900'
                }`}
              >
                Vendors Breakdown
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'orders' ? (
        <div className="card overflow-hidden border-cream-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100/70 text-walnut-800 uppercase font-semibold text-[11px] tracking-wider border-b border-cream-200">
                <tr>
                  <th className="py-3.5 px-4">PO Code & Date</th>
                  <th className="py-3.5 px-4">Supplier & GSTIN</th>
                  <th className="py-3.5 px-4">Material & Purity</th>
                  <th className="py-3.5 px-4 text-right">Inward Qty</th>
                  <th className="py-3.5 px-4 text-right">Rate & Grand Total</th>
                  <th className="py-3.5 px-4">Assay / Testing Status</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-walnut-500">
                      Loading supplier purchase orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-walnut-500">
                      No purchase orders found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.ordered;
                    const itemTypeMeta = ITEM_TYPE_MAP[order.itemType] || { label: order.itemType, tone: 'bg-cream-100 text-walnut-800' };

                    return (
                      <tr key={order._id} className="hover:bg-cream-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-gold-800">
                          <div>{order.orderNumber}</div>
                          <div className="text-[10px] text-walnut-400 font-sans font-normal mt-0.5">
                            {fmtDate(order.createdAt)}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-walnut-900">{order.supplierName}</div>
                          <div className="text-[11px] text-walnut-500 font-mono">
                            {order.gstin ? `GST: ${order.gstin}` : 'No GSTIN'}
                          </div>
                          {order.invoiceNumber && (
                            <div className="text-[10px] text-walnut-400 font-mono">
                              Inv: {order.invoiceNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold border ${itemTypeMeta.tone}`}
                          >
                            {itemTypeMeta.label}
                          </span>
                          <div className="text-[11px] font-medium text-walnut-800 mt-1 line-clamp-1">
                            {order.description}
                          </div>
                          <div className="text-[10px] text-walnut-500">Purity: {order.purity}</div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-walnut-900 font-mono">
                            {order.quantityOrWeight} <span className="text-[10px] font-sans font-normal text-walnut-500">{order.unit}</span>
                          </div>
                          {order.testedWeight && (
                            <div className="text-[10px] text-leaf-700 font-mono">
                              Scale: {order.testedWeight} {order.unit}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-walnut-900 font-mono">
                            {fmtINR(order.grandTotal)}
                          </div>
                          <div className="text-[10px] text-walnut-400 font-mono">
                            @{fmtINR(order.ratePerUnit)}/{order.unit}
                          </div>
                          <span
                            className={`inline-block mt-0.5 text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                              order.paymentStatus === 'fully_paid'
                                ? 'bg-leaf-100 text-leaf-800'
                                : order.paymentStatus === 'partially_paid'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-cream-200 text-walnut-700'
                            }`}
                          >
                            {order.paymentStatus?.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          {order.assayTestedPurity ? (
                            <div>
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-leaf-700">
                                <CheckCircle2 className="h-3.5 w-3.5 text-leaf-600" />
                                <span>Passed</span>
                              </div>
                              <div className="text-[10px] text-walnut-600 font-medium">
                                {order.assayTestedPurity}
                              </div>
                            </div>
                          ) : order.status === 'in_transit' ? (
                            <div className="flex items-center gap-1 text-[11px] text-sky-700 font-medium">
                              <Truck className="h-3.5 w-3.5 text-sky-600" />
                              <span>En Route</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-walnut-400 italic">Pending Lab Assay</span>
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
                          <div className="flex items-center justify-center gap-1.5">
                            {isStaff && order.status !== 'approved' && order.status !== 'rejected' && (
                              <button
                                onClick={() => {
                                  setAssayModalItem(order);
                                  setAssayForm({
                                    testedWeight: order.testedWeight || order.quantityOrWeight,
                                    assayTestedPurity: order.assayTestedPurity || order.purity,
                                    findings: order.assayFindings || '',
                                  });
                                }}
                                title="Record Scale & Lab Assay"
                                className="p-1 rounded text-amber-800 hover:bg-amber-500/10 transition-colors"
                              >
                                <Scale className="h-4 w-4" />
                              </button>
                            )}

                            {isStaff && order.status === 'received_testing' && (
                              <button
                                onClick={() => {
                                  setApproveModalItem(order);
                                  setApprovalNotes('');
                                }}
                                title="Maker-Checker Vault Approval"
                                className="p-1 rounded text-leaf-800 hover:bg-leaf-500/10 transition-colors"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                            )}

                            <button
                              onClick={() => setHistoryModalItem(order)}
                              title="View Audit Trail & PO Timeline"
                              className="p-1 rounded text-walnut-600 hover:bg-cream-200 transition-colors"
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
        /* Vendors Breakdown Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(
            orders.reduce((acc, o) => {
              if (!acc[o.supplierName]) {
                acc[o.supplierName] = {
                  name: o.supplierName,
                  contact: o.supplierContact,
                  gstin: o.gstin,
                  ordersCount: 0,
                  totalValue: 0,
                  materials: new Set(),
                  approvedCount: 0,
                };
              }
              acc[o.supplierName].ordersCount += 1;
              acc[o.supplierName].totalValue += o.grandTotal || 0;
              acc[o.supplierName].materials.add(o.itemType);
              if (o.status === 'approved') acc[o.supplierName].approvedCount += 1;
              return acc;
            }, {})
          ).map(([supplierName, v]) => (
            <div key={supplierName} className="card p-5 bg-white border-cream-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-walnut-900 text-sm">{v.name}</h3>
                  <p className="text-xs text-walnut-500 font-mono mt-0.5">GST: {v.gstin || 'Unregistered'}</p>
                  {v.contact && <p className="text-xs text-walnut-500">{v.contact}</p>}
                </div>
                <span className="p-2 rounded-lg bg-gold-500/10 text-gold-700">
                  <Building2 className="h-5 w-5" />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cream-100 text-xs">
                <div>
                  <div className="text-walnut-500 text-[11px]">Total Volume</div>
                  <div className="font-bold text-walnut-900 font-mono">{fmtINR(v.totalValue)}</div>
                </div>
                <div>
                  <div className="text-walnut-500 text-[11px]">Completed Vaults</div>
                  <div className="font-bold text-leaf-700">
                    {v.approvedCount} / {v.ordersCount} POs
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-1">
                {Array.from(v.materials).map((mat) => (
                  <span
                    key={mat}
                    className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-cream-100 text-walnut-700"
                  >
                    {mat.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-2xl bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-4 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Create Raw Material Purchase Order
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
                  <label className="block font-semibold text-walnut-800 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Choksi Bullion Traders"
                    value={newOrder.supplierName}
                    onChange={(e) => setNewOrder({ ...newOrder, supplierName: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Supplier Contact</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98200 11223"
                    value={newOrder.supplierContact}
                    onChange={(e) => setNewOrder({ ...newOrder, supplierContact: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="27AAACC4455P1Z4"
                    value={newOrder.gstin}
                    onChange={(e) => setNewOrder({ ...newOrder, gstin: e.target.value })}
                    className="input w-full text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Material Category *</label>
                  <select
                    value={newOrder.itemType}
                    onChange={(e) => {
                      const t = e.target.value;
                      let defaultUnit = 'grams';
                      let defaultPurity = '24K (999.9)';
                      if (t === 'loose_diamonds' || t === 'colored_gemstones') {
                        defaultUnit = 'carats';
                        defaultPurity = 'VVS-VS / E-F';
                      }
                      setNewOrder({
                        ...newOrder,
                        itemType: t,
                        unit: defaultUnit,
                        purity: defaultPurity,
                      });
                    }}
                    className="input w-full text-xs"
                  >
                    {ITEM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Item Description & Specifications *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 24K Pure Gold Bullion Grain - Mint Certified"
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Purity Grade *</label>
                  <input
                    type="text"
                    required
                    placeholder="24K (999.9) or VVS1"
                    value={newOrder.purity}
                    onChange={(e) => setNewOrder({ ...newOrder, purity: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Quantity / Weight *</label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 500"
                      value={newOrder.quantityOrWeight}
                      onChange={(e) => setNewOrder({ ...newOrder, quantityOrWeight: e.target.value })}
                      className="input w-full text-xs rounded-r-none font-mono"
                    />
                    <select
                      value={newOrder.unit}
                      onChange={(e) => setNewOrder({ ...newOrder, unit: e.target.value })}
                      className="input text-xs rounded-l-none border-l-0 bg-cream-100"
                    >
                      <option value="grams">g</option>
                      <option value="carats">cts</option>
                      <option value="pieces">pcs</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Rate per Unit (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 7350"
                    value={newOrder.ratePerUnit}
                    onChange={(e) => setNewOrder({ ...newOrder, ratePerUnit: e.target.value })}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">GST Tax Rate (%)</label>
                  <select
                    value={newOrder.taxRate}
                    onChange={(e) => setNewOrder({ ...newOrder, taxRate: e.target.value })}
                    className="input w-full text-xs font-mono"
                  >
                    <option value="3">3% (Precious Metals & Gems)</option>
                    <option value="1.5">1.5% (Rough/Loose Diamonds)</option>
                    <option value="18">18% (Findings & Master Alloys)</option>
                    <option value="0">0% (Nil / SEZ)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Payment Terms</label>
                  <select
                    value={newOrder.paymentTerms}
                    onChange={(e) => setNewOrder({ ...newOrder, paymentTerms: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="immediate">Immediate / Spot</option>
                    <option value="advance_50">50% Advance</option>
                    <option value="net_15">Net 15 Days</option>
                    <option value="net_30">Net 30 Days</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={newOrder.deliveryDate}
                    onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                    className="input w-full text-xs"
                  />
                </div>
              </div>

              {/* Live Price Estimation */}
              {newOrder.quantityOrWeight && newOrder.ratePerUnit && (
                <div className="p-3 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-between">
                  <span className="font-semibold text-gold-900">Estimated Total (incl. Tax):</span>
                  <span className="font-mono text-sm font-bold text-gold-800">
                    {fmtINR(
                      Number(newOrder.quantityOrWeight) *
                        Number(newOrder.ratePerUnit) *
                        (1 + Number(newOrder.taxRate) / 100)
                    )}
                  </span>
                </div>
              )}

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
                  {create.isPending ? 'Generating PO...' : 'Issue Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSAY TESTING & GOODS INWARD MODAL */}
      {assayModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-lg bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Goods Inward & Assay Verification
                </h3>
              </div>
              <button
                onClick={() => setAssayModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800">
              <div className="font-semibold text-gold-800">{assayModalItem.orderNumber}</div>
              <div>{assayModalItem.supplierName}</div>
              <div className="text-walnut-600 mt-1">
                Ordered: {assayModalItem.quantityOrWeight} {assayModalItem.unit} of{' '}
                {assayModalItem.description} ({assayModalItem.purity})
              </div>
            </div>

            <form onSubmit={handleAssaySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Calibrated Scale Inward Weight ({assayModalItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder={`Ordered: ${assayModalItem.quantityOrWeight}`}
                  value={assayForm.testedWeight}
                  onChange={(e) => setAssayForm({ ...assayForm, testedWeight: e.target.value })}
                  className="input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Assay Tested Purity (XRF / Fire Assay / CVD Raman) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 99.98% Fine Gold (XRF Certified) or Natural Diamond Confirmed"
                  value={assayForm.assayTestedPurity}
                  onChange={(e) => setAssayForm({ ...assayForm, assayTestedPurity: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Lab Findings & Spectrometry Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Certified against LBMA standard sample. Purity within tolerance limit."
                  value={assayForm.findings}
                  onChange={(e) => setAssayForm({ ...assayForm, findings: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setAssayModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary text-xs shadow-gold"
                >
                  {act.isPending ? 'Recording Assay...' : 'Verify & Record Assay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAKER-CHECKER APPROVE & VAULT MODAL */}
      {approveModalItem && (
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
                  Maker-Checker Vault Approval
                </h3>
              </div>
              <button
                onClick={() => setApproveModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800 space-y-1">
              <div className="font-semibold text-gold-800">{approveModalItem.orderNumber}</div>
              <div>Supplier: {approveModalItem.supplierName}</div>
              <div>
                Verified Weight: {approveModalItem.testedWeight || approveModalItem.quantityOrWeight}{' '}
                {approveModalItem.unit}
              </div>
              <div className="text-leaf-700 font-semibold">
                Assay: {approveModalItem.assayTestedPurity}
              </div>
            </div>

            <form onSubmit={handleApproveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  Manager Approval Notes & Vault Compartment
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Verified quality and invoice amount. Transfer to Safe A-1 Raw Bullion compartment."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setApproveModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary bg-leaf-700 hover:bg-leaf-800 text-xs text-white"
                >
                  {act.isPending ? 'Approving...' : 'Approve & Transfer to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL & PO HISTORY MODAL */}
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
                  PO Audit Trail & Procurement History
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
              <div className="font-semibold text-gold-800">{historyModalItem.orderNumber}</div>
              <div>{historyModalItem.supplierName}</div>
              <div className="text-walnut-600 mt-1">
                Total: {fmtINR(historyModalItem.grandTotal)} | Status: {historyModalItem.status}
              </div>
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
