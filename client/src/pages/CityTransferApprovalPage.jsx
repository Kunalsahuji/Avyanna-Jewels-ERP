import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation } from '../api/hooks.js';
import { fmtDate } from '../lib.js';
import {
  ArrowRightLeft,
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  Plus,
  X,
  FileCheck,
  AlertTriangle,
  History,
  QrCode,
  MapPin,
  Scale,
  Sparkles,
  Send,
  Boxes,
  Building2,
  FileText
} from 'lucide-react';

function fmtCurrency(num) {
  if (!num && num !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
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

const BRANCHES = [
  'Mumbai Main Vault',
  'Surat Manufacturing Unit',
  'Delhi Flagship Showroom',
  'Jaipur Exhibition Depot',
  'Bangalore Boutique Vault',
  'Hyderabad Showcase Safe',
];

const CARRIER_OPTIONS = [
  'Secured Armored Carrier',
  'Brinks / BVC Logistics',
  'Personal Hand Carry (Staff Escort)',
  'Internal Security Courier',
];

const STATUS_CONFIG = {
  requested: { label: 'Pending Approval', bg: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
  approved: { label: 'Gate Pass Issued', bg: 'bg-sky-500/15 text-sky-800 border-sky-500/30' },
  in_transit: { label: 'Armored In Transit', bg: 'bg-purple-500/15 text-purple-800 border-purple-500/30' },
  received: { label: 'Vault Received', bg: 'bg-leaf-500/15 text-leaf-800 border-leaf-500/30' },
  rejected: { label: 'Rejected', bg: 'bg-brick-500/15 text-brick-700 border-brick-500/30' },
};

export default function CityTransferApprovalPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  // Modals state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [approveTransferItem, setApproveTransferItem] = useState(null);
  const [dispatchTransferItem, setDispatchTransferItem] = useState(null);
  const [receiveTransferItem, setReceiveTransferItem] = useState(null);
  const [gatePassItem, setGatePassItem] = useState(null);

  // Form states
  const [newTransfer, setNewTransfer] = useState({
    fromLocation: 'Mumbai Main Vault',
    toLocation: 'Delhi Flagship Showroom',
    totalGrossWeight: '',
    totalNetWeight: '',
    totalDiamondCarat: '',
    totalValuation: '',
    carrierType: 'Secured Armored Carrier',
    carrierPersonName: '',
    carrierContact: '',
    waybillNo: '',
    vehicleNo: '',
    notes: '',
  });

  const [approveForm, setApproveForm] = useState({
    remarks: '',
  });

  const [dispatchForm, setDispatchForm] = useState({
    carrierType: 'Secured Armored Carrier',
    carrierPersonName: '',
    carrierContact: '',
    waybillNo: '',
    vehicleNo: '',
    remarks: '',
  });

  const [receiveForm, setReceiveForm] = useState({
    weighedReturnGrossWeight: '',
    remarks: '',
  });

  const queryParams = useMemo(() => {
    const q = {};
    if (statusFilter) q.status = statusFilter;
    if (fromFilter) q.fromLocation = fromFilter;
    if (toFilter) q.toLocation = toFilter;
    if (search) q.search = search;
    return q;
  }, [statusFilter, fromFilter, toFilter, search]);

  const { data: listData, isLoading } = useList('city-transfers', queryParams);
  const { data: stats } = useStats('city-transfers', queryParams);
  const { create, act } = useResourceMutation('city-transfers');

  const transfers = listData?.items || [];

  // Handlers
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    create.mutate(
      {
        ...newTransfer,
        totalGrossWeight: Number(newTransfer.totalGrossWeight),
        totalNetWeight: Number(newTransfer.totalNetWeight || newTransfer.totalGrossWeight),
        totalDiamondCarat: Number(newTransfer.totalDiamondCarat) || 0,
        totalValuation: Number(newTransfer.totalValuation) || 0,
      },
      {
        onSuccess: () => {
          setShowRequestModal(false);
          setNewTransfer({
            fromLocation: 'Mumbai Main Vault',
            toLocation: 'Delhi Flagship Showroom',
            totalGrossWeight: '',
            totalNetWeight: '',
            totalDiamondCarat: '',
            totalValuation: '',
            carrierType: 'Secured Armored Carrier',
            carrierPersonName: '',
            carrierContact: '',
            waybillNo: '',
            vehicleNo: '',
            notes: '',
          });
        },
      }
    );
  };

  const handleApproveSubmit = (e) => {
    e.preventDefault();
    if (!approveTransferItem) return;
    act.mutate(
      {
        id: approveTransferItem._id,
        action: 'approve',
        body: approveForm,
      },
      {
        onSuccess: () => {
          setApproveTransferItem(null);
          setApproveForm({ remarks: '' });
        },
      }
    );
  };

  const handleDispatchSubmit = (e) => {
    e.preventDefault();
    if (!dispatchTransferItem) return;
    act.mutate(
      {
        id: dispatchTransferItem._id,
        action: 'dispatch',
        body: dispatchForm,
      },
      {
        onSuccess: () => {
          setDispatchTransferItem(null);
          setDispatchForm({
            carrierType: 'Secured Armored Carrier',
            carrierPersonName: '',
            carrierContact: '',
            waybillNo: '',
            vehicleNo: '',
            remarks: '',
          });
        },
      }
    );
  };

  const handleReceiveSubmit = (e) => {
    e.preventDefault();
    if (!receiveTransferItem) return;
    act.mutate(
      {
        id: receiveTransferItem._id,
        action: 'receive',
        body: {
          weighedReturnGrossWeight: Number(receiveForm.weighedReturnGrossWeight),
          remarks: receiveForm.remarks,
        },
      },
      {
        onSuccess: () => {
          setReceiveTransferItem(null);
          setReceiveForm({ weighedReturnGrossWeight: '', remarks: '' });
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!transfers.length) return;
    const headers = [
      'Transfer Code',
      'Gate Pass No',
      'Origin Branch',
      'Destination Branch',
      'Gross Wt (g)',
      'Net Gold Wt (g)',
      'Diamond Carats (ct)',
      'Declared Valuation (INR)',
      'Carrier Partner',
      'Waybill / Tracking No',
      'Status',
      'Requested By',
      'Approved By',
    ];
    const rows = transfers.map((t) => [
      t.transferNo,
      t.gatePassNo || 'PENDING',
      `"${t.fromLocation}"`,
      `"${t.toLocation}"`,
      t.totalGrossWeight,
      t.totalNetWeight,
      t.totalDiamondCarat || 0,
      t.totalValuation,
      `"${t.carrierType} (${t.carrierPersonName || 'N/A'})"`,
      t.waybillNo || '',
      t.status,
      t.requestedBy?.name || '',
      t.approvedBy?.name || '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tvisha_city_transfers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl border border-cream-200/80 bg-gradient-to-r from-cream-100 via-white to-cream-50 p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-tight text-walnut-950">
                City Transfer Approval &amp; Transit Passes
              </span>
              <span className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-400/20 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                <ShieldCheck className="h-3 w-3" /> Armored Transit Security
              </span>
            </div>
            <p className="mt-1 text-xs text-walnut-600">
              Inter-branch jewelry movements, official digital gate passes, armored carrier custody &amp; arrival weight reconciliations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="btn-ghost flex items-center gap-1.5 text-xs shadow-xs"
              title="Export transfer registry to CSV"
            >
              <Download className="h-3.5 w-3.5 text-walnut-600" /> Export Excel
            </button>
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn-primary flex items-center gap-1.5 text-xs shadow-sm"
            >
              <Plus className="h-4 w-4 text-gold-400" /> New Transfer Request
            </button>
          </div>
        </div>
      </div>

      {/* Top 5 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Transfers */}
        <div
          onClick={() => setStatusFilter('')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === '' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-walnut-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Movements</span>
            <ArrowRightLeft className="h-4 w-4 text-walnut-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">
            {stats?.totalTransfers ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-walnut-500">all inter-city transfers</p>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => setStatusFilter('requested')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === 'requested' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Sign-off</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-amber-700">
            {stats?.pendingApprovals ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-amber-600">awaiting manager gate pass</p>
        </div>

        {/* In Transit */}
        <div
          onClick={() => setStatusFilter('in_transit')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === 'in_transit' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Armored In Transit</span>
            <Truck className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-purple-700">
            {stats?.inTransit ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-purple-600">moving on road / flights</p>
        </div>

        {/* Delivered / Vault Received */}
        <div
          onClick={() => setStatusFilter('received')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === 'received' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-leaf-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Vault Received</span>
            <CheckCircle2 className="h-4 w-4 text-leaf-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-leaf-700">
            {stats?.received ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-leaf-600">safely verified &amp; docked</p>
        </div>

        {/* Transit Insured Valuation */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-walnut-700">
            <span className="text-xs font-semibold uppercase tracking-wider">In-Transit Value</span>
            <ShieldCheck className="h-4 w-4 text-gold-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-walnut-950">
            {fmtCurrency(stats?.totalInTransitValue)}
          </p>
          <p className="mt-1 text-[11px] text-walnut-500">
            Gold: <b>{stats?.totalInTransitGold ?? 0}g</b> in motion
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
                placeholder="Search Transfer code, Gate Pass No, waybill, carrier..."
                className="input py-1.5 pl-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Transfer Statuses</option>
              <option value="requested">Pending Approval</option>
              <option value="approved">Gate Pass Issued</option>
              <option value="in_transit">In Transit</option>
              <option value="received">Vault Received</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Origin Filter */}
            <select
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Origin Vaults</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Destination Filter */}
            <select
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Destination Vaults</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-walnut-500">
            <span>Showing <b>{transfers.length}</b> movements</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-cream-200 bg-cream-100 text-walnut-700">
              <tr>
                <th className="px-4 py-3 font-bold">Transfer &amp; Gate Pass</th>
                <th className="px-4 py-3 font-bold">Transit Route</th>
                <th className="px-4 py-3 font-bold">Consignment Details</th>
                <th className="px-4 py-3 font-bold">Total Weight (g)</th>
                <th className="px-4 py-3 font-bold">Carrier &amp; Logistics</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-walnut-500">
                    Loading transfer manifests…
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-walnut-500">
                    No city transfer records match the current filters.
                  </td>
                </tr>
              ) : (
                transfers.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.requested;

                  return (
                    <tr key={item._id} className="transition hover:bg-cream-50/60">
                      {/* Transfer No & Gate Pass */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-gold-700">
                          {item.transferNo}
                        </div>
                        {item.gatePassNo ? (
                          <div className="flex items-center gap-1 font-mono text-[10px] font-semibold text-sky-800">
                            <FileCheck className="h-3 w-3 text-sky-600" />
                            {item.gatePassNo}
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">Awaiting Gate Pass</span>
                        )}
                      </td>

                      {/* Route */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-walnut-900">
                          <span className="font-semibold text-walnut-800">{item.fromLocation.split(' ')[0]}</span>
                          <ArrowRightLeft className="h-3 w-3 text-gold-600" />
                          <span className="font-semibold text-walnut-950">{item.toLocation.split(' ')[0]}</span>
                        </div>
                        <div className="text-[10px] text-walnut-500">
                          {item.fromLocation} → {item.toLocation}
                        </div>
                      </td>

                      {/* Consignment */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-walnut-950">
                          {fmtCurrency(item.totalValuation)}
                        </div>
                        <div className="text-[10px] text-walnut-500">
                          {item.parcels?.length > 0 ? `${item.parcels.length} parcels included` : 'Consignment parcel batch'}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-walnut-900">
                          Gross: {item.totalGrossWeight}g
                        </div>
                        <div className="text-[10px] text-walnut-500">
                          Net Gold: <b>{item.totalNetWeight}g</b> {item.totalDiamondCarat > 0 && `· ${item.totalDiamondCarat}ct dia`}
                        </div>
                      </td>

                      {/* Carrier */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-walnut-800">{item.carrierType}</div>
                        <div className="text-[10px] text-walnut-500">
                          {item.carrierPersonName ? `Escort: ${item.carrierPersonName}` : 'Secured Transit'}{' '}
                          {item.waybillNo && `· Waybill: ${item.waybillNo}`}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusInfo.bg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Action Tray */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. Approve & Issue Gate Pass (if requested & Manager/Admin) */}
                          {item.status === 'requested' && isStaff && (
                            <button
                              onClick={() => {
                                setApproveTransferItem(item);
                                setApproveForm({ remarks: '' });
                              }}
                              className="btn inline-flex items-center gap-1 rounded bg-sky-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-sky-800 shadow-xs"
                              title="Approve & Generate Digital Gate Pass"
                            >
                              <FileCheck className="h-3 w-3" /> Approve
                            </button>
                          )}

                          {/* 2. Dispatch Armored Carrier (if approved) */}
                          {item.status === 'approved' && isStaff && (
                            <button
                              onClick={() => {
                                setDispatchTransferItem(item);
                                setDispatchForm({
                                  carrierType: item.carrierType || 'Secured Armored Carrier',
                                  carrierPersonName: item.carrierPersonName || '',
                                  carrierContact: item.carrierContact || '',
                                  waybillNo: item.waybillNo || '',
                                  vehicleNo: item.vehicleNo || '',
                                  remarks: '',
                                });
                              }}
                              className="btn inline-flex items-center gap-1 rounded bg-purple-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-purple-800 shadow-xs"
                              title="Dispatch with Armored Carrier"
                            >
                              <Truck className="h-3 w-3" /> Dispatch
                            </button>
                          )}

                          {/* 3. Acknowledge Receipt & Weigh (if in transit) */}
                          {item.status === 'in_transit' && (
                            <button
                              onClick={() => {
                                setReceiveTransferItem(item);
                                setReceiveForm({
                                  weighedReturnGrossWeight: item.totalGrossWeight,
                                  remarks: '',
                                });
                              }}
                              className="btn inline-flex items-center gap-1 rounded bg-leaf-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-leaf-700 shadow-xs"
                              title="Verify Weight & Receive into Destination Vault"
                            >
                              <Scale className="h-3 w-3" /> Receive
                            </button>
                          )}

                          {/* 4. Open Digital Gate Pass & Chain of Custody */}
                          <button
                            onClick={() => setGatePassItem(item)}
                            className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-walnut-950"
                            title="Digital Gate Pass & Security Audit Trail"
                          >
                            <QrCode className="h-4 w-4 text-gold-700" />
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

      {/* Modal 1: New Transfer Request */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                New Inter-City Transfer Request
              </h3>
              <button onClick={() => setShowRequestModal(false)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Origin Branch / Vault *</label>
                  <select
                    value={newTransfer.fromLocation}
                    onChange={(e) => setNewTransfer({ ...newTransfer, fromLocation: e.target.value })}
                    className="input text-xs"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Destination Branch / Vault *</label>
                  <select
                    value={newTransfer.toLocation}
                    onChange={(e) => setNewTransfer({ ...newTransfer, toLocation: e.target.value })}
                    className="input text-xs"
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total Gross Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTransfer.totalGrossWeight}
                    onChange={(e) => setNewTransfer({ ...newTransfer, totalGrossWeight: e.target.value })}
                    placeholder="e.g. 142.50"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Total Net Gold Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newTransfer.totalNetWeight}
                    onChange={(e) => setNewTransfer({ ...newTransfer, totalNetWeight: e.target.value })}
                    placeholder="e.g. 128.80"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Total Diamond Weight (ct)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransfer.totalDiamondCarat}
                    onChange={(e) => setNewTransfer({ ...newTransfer, totalDiamondCarat: e.target.value })}
                    placeholder="0.00"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Declared Insured Value (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newTransfer.totalValuation}
                    onChange={(e) => setNewTransfer({ ...newTransfer, totalValuation: e.target.value })}
                    placeholder="₹ 15,00,000"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Carrier Type</label>
                  <select
                    value={newTransfer.carrierType}
                    onChange={(e) => setNewTransfer({ ...newTransfer, carrierType: e.target.value })}
                    className="input text-xs"
                  >
                    {CARRIER_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Escort Agent / Driver Name</label>
                  <input
                    type="text"
                    value={newTransfer.carrierPersonName}
                    onChange={(e) => setNewTransfer({ ...newTransfer, carrierPersonName: e.target.value })}
                    placeholder="e.g. Vikas Deshmukh"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label">Transfer Justification &amp; Notes</label>
                <textarea
                  rows={3}
                  value={newTransfer.notes}
                  onChange={(e) => setNewTransfer({ ...newTransfer, notes: e.target.value })}
                  placeholder="Specify purpose: e.g. Bridal showcase replenishment, royal wedding viewing..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setShowRequestModal(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary text-xs">
                  {create.isPending ? 'Submitting…' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Approve & Generate Gate Pass */}
      {approveTransferItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Authorize Inter-City Gate Pass
              </h3>
              <button onClick={() => setApproveTransferItem(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs space-y-1">
                <p className="font-mono font-bold text-gold-700">{approveTransferItem.transferNo}</p>
                <p className="font-semibold text-walnut-900">
                  {approveTransferItem.fromLocation} → {approveTransferItem.toLocation}
                </p>
                <p className="text-walnut-600">
                  Declared Value: <b>{fmtCurrency(approveTransferItem.totalValuation)}</b> · Gross Wt: <b>{approveTransferItem.totalGrossWeight}g</b>
                </p>
              </div>

              <div>
                <label className="label">Approval &amp; Security Clearance Remarks</label>
                <textarea
                  rows={3}
                  value={approveForm.remarks}
                  onChange={(e) => setApproveForm({ ...approveForm, remarks: e.target.value })}
                  placeholder="Enter clearance notes or transit seal number instructions..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setApproveTransferItem(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn inline-flex items-center gap-1 rounded bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800">
                  {act.isPending ? 'Generating…' : 'Issue Gate Pass & Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Dispatch Armored Carrier */}
      {dispatchTransferItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Handover &amp; Dispatch Carrier
              </h3>
              <button onClick={() => setDispatchTransferItem(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs">
                <p className="font-mono font-bold text-sky-800">Gate Pass: {dispatchTransferItem.gatePassNo}</p>
                <p className="text-walnut-700 mt-0.5">
                  Route: <b>{dispatchTransferItem.fromLocation}</b> → <b>{dispatchTransferItem.toLocation}</b>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Carrier Type</label>
                  <select
                    value={dispatchForm.carrierType}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, carrierType: e.target.value })}
                    className="input text-xs"
                  >
                    {CARRIER_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Air Waybill / Docket No</label>
                  <input
                    type="text"
                    value={dispatchForm.waybillNo}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, waybillNo: e.target.value })}
                    placeholder="BVC-MUM-DEL-8921"
                    className="input font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Agent / Driver Name</label>
                  <input
                    type="text"
                    value={dispatchForm.carrierPersonName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, carrierPersonName: e.target.value })}
                    placeholder="Agent name"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Vehicle Plate No</label>
                  <input
                    type="text"
                    value={dispatchForm.vehicleNo}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNo: e.target.value })}
                    placeholder="MH-01-CV-4421"
                    className="input font-mono uppercase text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label">Dispatch Handover Notes</label>
                <textarea
                  rows={2}
                  value={dispatchForm.remarks}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, remarks: e.target.value })}
                  placeholder="Security seal numbers, package count, escort handover remarks..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setDispatchTransferItem(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn inline-flex items-center gap-1 rounded bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800">
                  {act.isPending ? 'Marking In Transit…' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Receive & Weight Verification */}
      {receiveTransferItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Acknowledge Vault Receipt
              </h3>
              <button onClick={() => setReceiveTransferItem(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs space-y-1">
                <p className="font-mono font-bold text-sky-800">Gate Pass: {receiveTransferItem.gatePassNo}</p>
                <p className="text-walnut-700">
                  Departure Gross Wt: <b>{receiveTransferItem.totalGrossWeight}g</b>
                </p>
                <p className="text-walnut-500">
                  Arriving at: <b>{receiveTransferItem.toLocation}</b>
                </p>
              </div>

              <div>
                <label className="label">Weighed Arrival Gross Weight (grams) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={receiveForm.weighedReturnGrossWeight}
                  onChange={(e) => setReceiveForm({ ...receiveForm, weighedReturnGrossWeight: e.target.value })}
                  placeholder="Input verified digital scale reading"
                  className="input font-mono font-bold text-xs"
                />
                {receiveForm.weighedReturnGrossWeight && (
                  <div className="mt-1.5 text-[11px] font-semibold">
                    {Number(receiveForm.weighedReturnGrossWeight) === receiveTransferItem.totalGrossWeight ? (
                      <span className="text-leaf-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Exact 100% weight match (0.000g variance)
                      </span>
                    ) : (
                      <span className="text-brick-600 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Variance detected: {(receiveTransferItem.totalGrossWeight - Number(receiveForm.weighedReturnGrossWeight)).toFixed(3)}g difference!
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Vault Custodian Verification Notes</label>
                <textarea
                  rows={3}
                  value={receiveForm.remarks}
                  onChange={(e) => setReceiveForm({ ...receiveForm, remarks: e.target.value })}
                  placeholder="Security seals checked intact, digital scale calibrated, placed in Safe B3..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setReceiveTransferItem(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn inline-flex items-center gap-1 rounded bg-leaf-600 px-4 py-2 text-xs font-bold text-white hover:bg-leaf-700">
                  {act.isPending ? 'Verifying…' : 'Dock & Receive into Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Digital Gate Pass & Chain of Custody (Matching Luxury Reference Theme) */}
      {gatePassItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-white">
            {/* Dark Header */}
            <div className="bg-[#241710] px-6 py-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold tracking-wide text-cream-100">
                      {gatePassItem.transferNo}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/40 bg-sky-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-200">
                      <ShieldCheck className="h-3 w-3" />
                      {gatePassItem.gatePassNo || 'APPROVAL PENDING'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-cream-200/90 font-normal">
                    Tvisha Jewlz Inter-Branch Transit Pass &amp; Chain of Custody
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGatePassItem(null)}
                  className="rounded p-1 text-cream-300 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs text-walnut-800">
              {/* Gate Pass Card */}
              <div className="rounded-xl border border-gold-500/40 bg-cream-50/60 p-4">
                <div className="flex items-center justify-between border-b border-gold-500/20 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gold-700">Official Transit Pass</span>
                    <h4 className="font-mono text-base font-bold text-walnut-950">{gatePassItem.gatePassNo || 'PENDING CLEARANCE'}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-walnut-500">Security Clearance</span>
                    <p className="font-semibold text-leaf-700">{gatePassItem.status.toUpperCase()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-walnut-500">Origin Vault</span>
                    <p className="font-semibold text-walnut-900">{gatePassItem.fromLocation}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-walnut-500">Destination Vault</span>
                    <p className="font-semibold text-walnut-900">{gatePassItem.toLocation}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-walnut-500">Consignment Valuation</span>
                    <p className="font-mono font-bold text-gold-800">{fmtCurrency(gatePassItem.totalValuation)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-walnut-500">Gross / Net Weight</span>
                    <p className="font-semibold text-walnut-900">{gatePassItem.totalGrossWeight}g Gross · {gatePassItem.totalNetWeight}g Net</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-walnut-500">Carrier Logistics</span>
                    <p className="font-medium text-walnut-800">{gatePassItem.carrierType}</p>
                    <p className="text-[10px] text-walnut-500">Escort: {gatePassItem.carrierPersonName || 'Authorized Custodian'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-walnut-500">Tracking / Air Waybill</span>
                    <p className="font-mono text-xs font-semibold text-walnut-900">{gatePassItem.waybillNo || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  CHAIN OF CUSTODY SECURITY AUDIT TRAIL
                </h4>

                <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cream-300">
                  {gatePassItem.timeline?.length ? (
                    gatePassItem.timeline.map((evt, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-walnut-400 bg-white" />
                        <div className="text-xs">
                          <span className="font-medium text-walnut-600">
                            {fmtDateTime(evt.timestamp)} • {evt.user?.name || 'Security Personnel'}
                          </span>
                          <div className="mt-1 rounded border-l-2 border-gold-500 bg-cream-50 px-3 py-1.5 text-walnut-800">
                            <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] text-gold-700">
                              <span>{evt.action.replace(/_/g, ' ')}</span>
                              {evt.gatePassNo && (
                                <span className="text-sky-700 font-mono text-[9px] font-semibold">({evt.gatePassNo})</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-walnut-700">{evt.remarks}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-walnut-400">No events logged yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Bottom Footer */}
            <div className="border-t border-cream-200 bg-[#fbf7f2] px-6 py-3 flex justify-between items-center">
              <span className="text-[10px] font-mono text-walnut-400">
                SECURED ENCRYPTED LEDGER
              </span>
              <button
                type="button"
                onClick={() => setGatePassItem(null)}
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
