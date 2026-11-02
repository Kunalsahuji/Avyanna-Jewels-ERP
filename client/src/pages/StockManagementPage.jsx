import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate } from '../lib.js';
import {
  Package,
  Gem,
  Plus,
  Search,
  Filter,
  Download,
  ArrowRightLeft,
  Hammer,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  Barcode,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  History,
  X,
  FileText,
  Boxes
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

const ITEM_TYPE_LABELS = {
  ring: 'Ring',
  necklace: 'Necklace',
  bangle: 'Bangles',
  earring: 'Earrings',
  bracelet: 'Bracelet',
  pendant: 'Pendant',
  loose_diamonds: 'Loose Diamonds',
  gold_bullion: 'Gold Bullion',
  other: 'Other Piece',
};

const STATUS_CONFIG = {
  in_stock: { label: 'In Stock', bg: 'bg-leaf-500/15 text-leaf-700 border-leaf-500/30' },
  issued_to_karigar: { label: 'With Karigar', bg: 'bg-gold-500/15 text-gold-800 border-gold-500/30' },
  in_transit: { label: 'In Transit', bg: 'bg-sky-500/15 text-sky-800 border-sky-500/30' },
  transfer_pending: { label: 'Transfer Pending', bg: 'bg-amber-500/15 text-amber-800 border-amber-500/30' },
  sold: { label: 'Sold / Dispatched', bg: 'bg-walnut-200 text-walnut-700 border-walnut-300' },
  reserved: { label: 'Reserved', bg: 'bg-purple-500/15 text-purple-800 border-purple-500/30' },
};

export default function StockManagementPage() {
  const { isStaff, user } = useAuth();
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [transferParcel, setTransferParcel] = useState(null);
  const [issueParcel, setIssueParcel] = useState(null);
  const [returnParcel, setReturnParcel] = useState(null);
  const [historyParcel, setHistoryParcel] = useState(null);

  // Form states
  const [newParcel, setNewParcel] = useState({
    title: '',
    description: '',
    itemType: 'ring',
    purity: '18K',
    grossWeight: '',
    netWeight: '',
    diamondCarat: '',
    stonePieces: '',
    huid: '',
    location: 'Main Vault',
    valuation: '',
  });

  const [transferForm, setTransferForm] = useState({
    toLocation: 'Showroom Safe',
    remarks: '',
  });

  const [issueForm, setIssueForm] = useState({
    karigarId: '',
    remarks: '',
  });

  const [returnForm, setReturnForm] = useState({
    returnedWeight: '',
    remarks: '',
  });

  const { data: users = [] } = useUsers();
  const karigars = useMemo(
    () => users.filter((u) => u.department === 'Production' || u.role === 'doer'),
    [users]
  );

  const queryParams = useMemo(() => {
    const q = {};
    if (locationFilter) q.location = locationFilter;
    if (itemTypeFilter) q.itemType = itemTypeFilter;
    if (statusFilter) q.status = statusFilter;
    if (search) q.search = search;
    return q;
  }, [locationFilter, itemTypeFilter, statusFilter, search]);

  const { data: listData, isLoading } = useList('stock', queryParams);
  const { data: stats } = useStats('stock', queryParams);
  const { create, act } = useResourceMutation('stock');

  const parcels = listData?.items || [];

  // Handlers
  const handleCreateSubmit = (e) => {
    e.preventDefault();
    create.mutate(
      {
        ...newParcel,
        grossWeight: Number(newParcel.grossWeight),
        netWeight: Number(newParcel.netWeight || newParcel.grossWeight),
        diamondCarat: Number(newParcel.diamondCarat) || 0,
        stonePieces: Number(newParcel.stonePieces) || 0,
        valuation: Number(newParcel.valuation) || 0,
      },
      {
        onSuccess: () => {
          setShowAddModal(false);
          setNewParcel({
            title: '',
            description: '',
            itemType: 'ring',
            purity: '18K',
            grossWeight: '',
            netWeight: '',
            diamondCarat: '',
            stonePieces: '',
            huid: '',
            location: 'Main Vault',
            valuation: '',
          });
        },
      }
    );
  };

  const handleTransferSubmit = (e) => {
    e.preventDefault();
    if (!transferParcel) return;
    act.mutate(
      {
        id: transferParcel._id,
        action: 'transfer',
        body: transferForm,
      },
      {
        onSuccess: () => {
          setTransferParcel(null);
          setTransferForm({ toLocation: 'Showroom Safe', remarks: '' });
        },
      }
    );
  };

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    if (!issueParcel || !issueForm.karigarId) return;
    act.mutate(
      {
        id: issueParcel._id,
        action: 'issue-karigar',
        body: issueForm,
      },
      {
        onSuccess: () => {
          setIssueParcel(null);
          setIssueForm({ karigarId: '', remarks: '' });
        },
      }
    );
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    if (!returnParcel) return;
    act.mutate(
      {
        id: returnParcel._id,
        action: 'return-vault',
        body: {
          returnedWeight: returnForm.returnedWeight ? Number(returnForm.returnedWeight) : undefined,
          remarks: returnForm.remarks,
        },
      },
      {
        onSuccess: () => {
          setReturnParcel(null);
          setReturnForm({ returnedWeight: '', remarks: '' });
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!parcels.length) return;
    const headers = [
      'Parcel ID',
      'Barcode',
      'Item Type',
      'Title',
      'Purity',
      'Gross Wt (g)',
      'Net Wt (g)',
      'Diamond Carats (ct)',
      'HUID',
      'Location',
      'Status',
      'Valuation (INR)',
    ];
    const rows = parcels.map((p) => [
      p.parcelId,
      p.barcode,
      p.itemType,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      p.purity,
      p.grossWeight,
      p.netWeight,
      p.diamondCarat || 0,
      p.huid || '',
      p.location,
      p.status,
      p.valuation || 0,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tvisha_stock_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
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
                Stock Management &amp; Vault Parcels
              </span>
              <span className="flex items-center gap-1 rounded-full border border-gold-500/40 bg-gold-400/20 px-2.5 py-0.5 text-[11px] font-bold text-gold-700">
                <Sparkles className="h-3 w-3" /> Live Inventory
              </span>
            </div>
            <p className="mt-1 text-xs text-walnut-600">
              Real-time bullion custody, barcoded lot tracking, Karigar workshops, and gold weight reconciliations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="btn-ghost flex items-center gap-1.5 text-xs shadow-xs"
              title="Export filtered stock to CSV spreadsheet"
            >
              <Download className="h-3.5 w-3.5 text-walnut-600" /> Export Excel
            </button>
            {isStaff && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary flex items-center gap-1.5 text-xs shadow-sm"
              >
                <Plus className="h-4 w-4 text-gold-400" /> Intake New Parcel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6 Luxury Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Parcels */}
        <div
          onClick={() => setStatusFilter('')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === '' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-walnut-600">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Parcels</span>
            <Boxes className="h-4 w-4 text-walnut-400" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">
            {stats?.totalParcels ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-walnut-500">active tracked lots</p>
        </div>

        {/* In Vault */}
        <div
          onClick={() => setStatusFilter('in_stock')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === 'in_stock' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-leaf-700">
            <span className="text-xs font-semibold uppercase tracking-wider">In Vault</span>
            <ShieldCheck className="h-4 w-4 text-leaf-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-leaf-700">
            {stats?.inVault ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-leaf-600">vault &amp; showroom safe</p>
        </div>

        {/* In Workshop / Karigar */}
        <div
          onClick={() => setStatusFilter('issued_to_karigar')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === 'issued_to_karigar' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-gold-700">
            <span className="text-xs font-semibold uppercase tracking-wider">With Karigar</span>
            <Hammer className="h-4 w-4 text-gold-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-gold-700">
            {stats?.inWorkshop ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-gold-600">in manufacturing floor</p>
        </div>

        {/* In Transit */}
        <div
          onClick={() => setStatusFilter('in_transit')}
          className={`card cursor-pointer p-4 transition hover:shadow-md ${
            statusFilter === 'in_transit' ? 'ring-2 ring-gold-500/60' : ''
          }`}
        >
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-xs font-semibold uppercase tracking-wider">In Transit</span>
            <ArrowRightLeft className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-sky-700">
            {stats?.inTransit ?? '—'}
          </p>
          <p className="mt-1 text-[11px] text-sky-600">city / branch transit</p>
        </div>

        {/* Net Gold Weight (g) */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-walnut-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Gold Wt</span>
            <span className="font-mono text-xs font-bold text-gold-600">GOLD</span>
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">
            {stats?.totalNetWeight ?? '—'}
            <span className="text-base font-normal text-walnut-500"> g</span>
          </p>
          <p className="mt-1 text-[11px] text-walnut-500">Gross: {stats?.totalGrossWeight ?? 0}g</p>
        </div>

        {/* Total Diamond Carats */}
        <div className="card p-4">
          <div className="flex items-center justify-between text-walnut-700">
            <span className="text-xs font-semibold uppercase tracking-wider">Diamond Wt</span>
            <Gem className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 font-display text-3xl font-bold text-walnut-950">
            {stats?.totalDiamondCarats ?? '—'}
            <span className="text-base font-normal text-walnut-500"> ct</span>
          </p>
          <p className="mt-1 text-[11px] text-walnut-500">Est: {fmtCurrency(stats?.totalValuation)}</p>
        </div>
      </div>

      {/* Filters Bar */}
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
                placeholder="Search Parcel ID, title, HUID, or barcode..."
                className="input py-1.5 pl-9 text-xs"
              />
            </div>

            {/* Location filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Vault Locations</option>
              <option value="Main Vault">Main Vault</option>
              <option value="Showroom Safe">Showroom Safe</option>
              <option value="Karigar Workshop">Karigar Workshop</option>
              <option value="In Transit">In Transit</option>
              <option value="Exhibition Stall">Exhibition Stall</option>
            </select>

            {/* Item Type filter */}
            <select
              value={itemTypeFilter}
              onChange={(e) => setItemTypeFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Jewelry Types</option>
              <option value="ring">Rings</option>
              <option value="necklace">Necklaces</option>
              <option value="bangle">Bangles</option>
              <option value="earring">Earrings</option>
              <option value="bracelet">Bracelets</option>
              <option value="pendant">Pendants</option>
              <option value="loose_diamonds">Loose Diamonds</option>
              <option value="gold_bullion">Gold Bullion</option>
            </select>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto py-1.5 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="in_stock">In Stock / Vault</option>
              <option value="issued_to_karigar">With Karigar</option>
              <option value="in_transit">In Transit</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-walnut-500">
            <span>Showing <b>{parcels.length}</b> parcels</span>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-cream-200 bg-cream-100 text-walnut-700">
              <tr>
                <th className="px-4 py-3 font-bold">Parcel &amp; Barcode</th>
                <th className="px-4 py-3 font-bold">Jewelry Item</th>
                <th className="px-4 py-3 font-bold">Purity &amp; Wt (g)</th>
                <th className="px-4 py-3 font-bold">Diamonds (ct)</th>
                <th className="px-4 py-3 font-bold">Vault Location</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Valuation</th>
                <th className="px-4 py-3 text-center font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-walnut-500">
                    Loading live stock parcels…
                  </td>
                </tr>
              ) : parcels.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-walnut-500">
                    No parcels found matching the current filters.
                  </td>
                </tr>
              ) : (
                parcels.map((parcel) => {
                  const statusInfo = STATUS_CONFIG[parcel.status] || STATUS_CONFIG.in_stock;

                  return (
                    <tr key={parcel._id} className="transition hover:bg-cream-50/60">
                      {/* Parcel ID & Barcode */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-gold-700">
                          {parcel.parcelId}
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[10px] text-walnut-500">
                          <Barcode className="h-3 w-3" />
                          {parcel.barcode}
                        </div>
                      </td>

                      {/* Jewelry Item */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-walnut-950">{parcel.title}</div>
                        <div className="flex items-center gap-2 text-[10px] text-walnut-500">
                          <span className="capitalize">{ITEM_TYPE_LABELS[parcel.itemType] || parcel.itemType}</span>
                          {parcel.huid && (
                            <span className="rounded bg-cream-200 px-1.5 py-0.2 font-mono font-bold text-walnut-700">
                              HUID: {parcel.huid}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Purity & Weight */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-semibold text-walnut-900">
                          <span className="rounded bg-gold-400/20 px-1.5 py-0.5 text-[10px] font-bold text-gold-800">
                            {parcel.purity}
                          </span>
                          <span>Net: {parcel.netWeight}g</span>
                        </div>
                        <div className="text-[10px] text-walnut-500">
                          Gross: {parcel.grossWeight}g
                        </div>
                      </td>

                      {/* Diamonds */}
                      <td className="px-4 py-3">
                        {parcel.diamondCarat > 0 ? (
                          <div className="flex items-center gap-1 font-semibold text-sky-800">
                            <Gem className="h-3 w-3 text-sky-600" />
                            <span>{parcel.diamondCarat} ct</span>
                            {parcel.stonePieces > 0 && (
                              <span className="text-[10px] text-walnut-500">({parcel.stonePieces} pcs)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-walnut-400">—</span>
                        )}
                      </td>

                      {/* Location & Custodian */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 font-medium text-walnut-800">
                          <MapPin className="h-3 w-3 text-walnut-400" />
                          <span>{parcel.location}</span>
                        </div>
                        {parcel.assignedTo && (
                          <div className="text-[10px] text-gold-700">
                            Custodian: {parcel.assignedTo.name}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusInfo.bg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Valuation */}
                      <td className="px-4 py-3 font-mono font-semibold text-walnut-900">
                        {fmtCurrency(parcel.valuation)}
                      </td>

                      {/* Action Tray */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Transfer Location */}
                          <button
                            onClick={() => {
                              setTransferParcel(parcel);
                              setTransferForm({ toLocation: 'Showroom Safe', remarks: '' });
                            }}
                            className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-sky-700"
                            title="Transfer Vault Location"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </button>

                          {/* Issue to Karigar (if in stock) */}
                          {parcel.status === 'in_stock' && (
                            <button
                              onClick={() => {
                                setIssueParcel(parcel);
                                setIssueForm({ karigarId: '', remarks: '' });
                              }}
                              className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-gold-700"
                              title="Issue to Karigar Workshop"
                            >
                              <Hammer className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Return to Vault (if in workshop) */}
                          {parcel.status === 'issued_to_karigar' && (
                            <button
                              onClick={() => {
                                setReturnParcel(parcel);
                                setReturnForm({ returnedWeight: parcel.netWeight, remarks: '' });
                              }}
                              className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-leaf-700"
                              title="Return to Vault (Weight Verification)"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* View Audit History */}
                          <button
                            onClick={() => setHistoryParcel(parcel)}
                            className="rounded p-1 text-walnut-500 transition hover:bg-cream-100 hover:text-walnut-950"
                            title="Parcel Audit History & Chain of Custody"
                          >
                            <History className="h-3.5 w-3.5" />
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

      {/* Modal 1: Intake New Parcel */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">Intake New Stock Parcel</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label className="label">Item Title *</label>
                <input
                  type="text"
                  required
                  value={newParcel.title}
                  onChange={(e) => setNewParcel({ ...newParcel, title: e.target.value })}
                  placeholder="e.g. 18K Yellow Gold Solitaire Diamond Ring 1.05ct"
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="label">Description &amp; Specifications</label>
                <textarea
                  rows={2}
                  value={newParcel.description}
                  onChange={(e) => setNewParcel({ ...newParcel, description: e.target.value })}
                  placeholder="Detailed specifications, stone certifications, etc."
                  className="input text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Jewelry Category *</label>
                  <select
                    value={newParcel.itemType}
                    onChange={(e) => setNewParcel({ ...newParcel, itemType: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="ring">Ring</option>
                    <option value="necklace">Necklace</option>
                    <option value="bangle">Bangles</option>
                    <option value="earring">Earrings</option>
                    <option value="bracelet">Bracelet</option>
                    <option value="pendant">Pendant</option>
                    <option value="loose_diamonds">Loose Diamonds</option>
                    <option value="gold_bullion">Gold Bullion</option>
                    <option value="other">Other Piece</option>
                  </select>
                </div>

                <div>
                  <label className="label">Metal Purity *</label>
                  <select
                    value={newParcel.purity}
                    onChange={(e) => setNewParcel({ ...newParcel, purity: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="14K">14K Gold</option>
                    <option value="18K">18K Gold (Hallmarked)</option>
                    <option value="22K">22K Gold (Traditional)</option>
                    <option value="24K">24K Pure Bullion (999)</option>
                    <option value="950 Platinum">950 Platinum</option>
                    <option value="925 Silver">925 Silver</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Gross Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newParcel.grossWeight}
                    onChange={(e) => setNewParcel({ ...newParcel, grossWeight: e.target.value })}
                    placeholder="e.g. 14.85"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Net Gold Weight (grams) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newParcel.netWeight}
                    onChange={(e) => setNewParcel({ ...newParcel, netWeight: e.target.value })}
                    placeholder="e.g. 14.20"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Diamond Wt (ct)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newParcel.diamondCarat}
                    onChange={(e) => setNewParcel({ ...newParcel, diamondCarat: e.target.value })}
                    placeholder="0.00"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">Stone Pieces</label>
                  <input
                    type="number"
                    value={newParcel.stonePieces}
                    onChange={(e) => setNewParcel({ ...newParcel, stonePieces: e.target.value })}
                    placeholder="0"
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="label">BIS HUID Code</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={newParcel.huid}
                    onChange={(e) => setNewParcel({ ...newParcel, huid: e.target.value.toUpperCase() })}
                    placeholder="TJ678X"
                    className="input font-mono uppercase text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Initial Location *</label>
                  <select
                    value={newParcel.location}
                    onChange={(e) => setNewParcel({ ...newParcel, location: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="Main Vault">Main Vault</option>
                    <option value="Showroom Safe">Showroom Safe</option>
                    <option value="Karigar Workshop">Karigar Workshop</option>
                    <option value="In Transit">In Transit</option>
                  </select>
                </div>

                <div>
                  <label className="label">Estimated Valuation (₹)</label>
                  <input
                    type="number"
                    value={newParcel.valuation}
                    onChange={(e) => setNewParcel({ ...newParcel, valuation: e.target.value })}
                    placeholder="₹ 2,50,000"
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={create.isPending} className="btn-primary text-xs">
                  {create.isPending ? 'Intaking…' : 'Save & Barcode Parcel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Transfer Location */}
      {transferParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Transfer Parcel: {transferParcel.parcelId}
              </h3>
              <button onClick={() => setTransferParcel(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs">
                <p className="font-semibold text-walnut-900">{transferParcel.title}</p>
                <p className="mt-1 text-walnut-600">
                  Current Location: <b>{transferParcel.location}</b> · Net Wt: <b>{transferParcel.netWeight}g</b>
                </p>
              </div>

              <div>
                <label className="label">Destination Location *</label>
                <select
                  value={transferForm.toLocation}
                  onChange={(e) => setTransferForm({ ...transferForm, toLocation: e.target.value })}
                  className="input text-xs"
                >
                  <option value="Main Vault">Main Vault</option>
                  <option value="Showroom Safe">Showroom Safe</option>
                  <option value="Karigar Workshop">Karigar Workshop</option>
                  <option value="In Transit">In Transit (City/Branch Transit)</option>
                  <option value="Exhibition Stall">Exhibition Stall</option>
                  <option value="Quality Check Lab">Quality Check Lab</option>
                </select>
              </div>

              <div>
                <label className="label">Transfer Notes / Reason</label>
                <textarea
                  rows={3}
                  value={transferForm.remarks}
                  onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
                  placeholder="e.g. Moved to showroom display case 4 for VIP client viewing..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setTransferParcel(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn-primary text-xs">
                  {act.isPending ? 'Transferring…' : 'Confirm Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Issue to Karigar */}
      {issueParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Issue to Karigar: {issueParcel.parcelId}
              </h3>
              <button onClick={() => setIssueParcel(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs">
                <p className="font-semibold text-walnut-900">{issueParcel.title}</p>
                <p className="mt-1 text-walnut-600">
                  Net Gold Weight: <b>{issueParcel.netWeight}g</b> · Diamond Carats: <b>{issueParcel.diamondCarat}ct</b>
                </p>
              </div>

              <div>
                <label className="label">Select Karigar / Production Craftsman *</label>
                <select
                  required
                  value={issueForm.karigarId}
                  onChange={(e) => setIssueForm({ ...issueForm, karigarId: e.target.value })}
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
                <label className="label">Job Order Instructions</label>
                <textarea
                  rows={3}
                  value={issueForm.remarks}
                  onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
                  placeholder="e.g. Setting of center diamond and final rhodium polishing..."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setIssueParcel(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn-primary text-xs">
                  {act.isPending ? 'Issuing…' : 'Issue to Karigar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Return to Vault (Weight Verification) */}
      {returnParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cream-200 pb-3">
              <h3 className="font-display text-xl font-bold text-walnut-950">
                Return to Vault: {returnParcel.parcelId}
              </h3>
              <button onClick={() => setReturnParcel(null)} className="rounded p-1 text-walnut-400 hover:text-walnut-900">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="mt-4 space-y-3">
              <div className="rounded-lg bg-cream-100 p-3 text-xs">
                <p className="font-semibold text-walnut-900">{returnParcel.title}</p>
                <p className="mt-1 text-walnut-600">
                  Issued Net Wt: <b>{returnParcel.netWeight}g</b> · Custodian: <b>{returnParcel.assignedTo?.name || 'Karigar'}</b>
                </p>
              </div>

              <div>
                <label className="label">Weighed Return Weight (grams) *</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={returnForm.returnedWeight}
                  onChange={(e) => setReturnForm({ ...returnForm, returnedWeight: e.target.value })}
                  placeholder="Weighed return in grams"
                  className="input text-xs font-mono font-bold"
                />
                {returnForm.returnedWeight && Number(returnForm.returnedWeight) < returnParcel.netWeight && (
                  <p className="mt-1 text-[11px] font-semibold text-brick-600">
                    ⚠ Metal loss detected: {(returnParcel.netWeight - Number(returnForm.returnedWeight)).toFixed(3)}g
                  </p>
                )}
              </div>

              <div>
                <label className="label">Verification Notes</label>
                <textarea
                  rows={3}
                  value={returnForm.remarks}
                  onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                  placeholder="e.g. Received intact, verified under digital scale in Main Vault."
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-cream-200">
                <button type="button" onClick={() => setReturnParcel(null)} className="btn-ghost text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={act.isPending} className="btn-primary text-xs">
                  {act.isPending ? 'Verifying…' : 'Confirm Return to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 5: Parcel Audit History & Chain of Custody (Matching Reference Luxury Theme) */}
      {historyParcel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-walnut-950/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-white">
            {/* Dark Header */}
            <div className="bg-[#241710] px-6 py-4 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold tracking-wide text-cream-100">
                      {historyParcel.parcelId}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                      <Barcode className="h-3 w-3" />
                      {historyParcel.barcode}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-cream-200/90 font-normal">
                    {historyParcel.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryParcel(null)}
                  className="rounded p-1 text-cream-300 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs text-walnut-800">
              {/* Key Specs */}
              <div className="divide-y divide-cream-200 border-b border-cream-200 pb-2">
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Category</span>
                  <span className="font-semibold text-walnut-900 capitalize">{ITEM_TYPE_LABELS[historyParcel.itemType] || historyParcel.itemType}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Purity</span>
                  <span className="font-semibold text-walnut-900">{historyParcel.purity}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Weights</span>
                  <span className="font-semibold text-walnut-900">Gross: {historyParcel.grossWeight}g · Net Gold: {historyParcel.netWeight}g</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Diamonds</span>
                  <span className="font-semibold text-walnut-900">{historyParcel.diamondCarat ? `${historyParcel.diamondCarat} ct` : 'None'}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Current Location</span>
                  <span className="font-semibold text-walnut-900">{historyParcel.location}</span>
                </div>
                <div className="grid grid-cols-[140px_1fr] py-2 items-center">
                  <span className="text-walnut-500 font-medium">Valuation</span>
                  <span className="font-mono font-semibold text-walnut-900">{fmtCurrency(historyParcel.valuation)}</span>
                </div>
              </div>

              {/* Chain of Custody Timeline */}
              <div className="space-y-3 pt-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-walnut-500">
                  CHAIN OF CUSTODY &amp; AUDIT TIMELINE
                </h4>

                <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cream-300">
                  {historyParcel.history?.length ? (
                    historyParcel.history.map((h, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-5 top-1 h-3 w-3 rounded-full border-2 border-walnut-400 bg-white" />
                        <div className="text-xs">
                          <span className="font-medium text-walnut-600">
                            {fmtDateTime(h.timestamp)} • {h.user?.name || 'Authorized Staff'}
                          </span>
                          <div className="mt-1 rounded border-l-2 border-gold-500 bg-cream-50 px-3 py-1.5 text-walnut-800">
                            <div className="font-bold uppercase text-[10px] text-gold-700">
                              {h.action.replace(/_/g, ' ')}
                            </div>
                            <p className="mt-0.5 text-walnut-700">{h.remarks}</p>
                            {h.toLocation && (
                              <p className="mt-0.5 font-medium text-[10px] text-walnut-500">
                                Location: {h.fromLocation || '—'} → {h.toLocation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-walnut-400">No prior history recorded for this parcel.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-cream-200 bg-[#fbf7f2] px-6 py-3 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setHistoryParcel(null)}
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

