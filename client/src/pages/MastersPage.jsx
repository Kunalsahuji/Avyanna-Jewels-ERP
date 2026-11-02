import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useList, useStats, useResourceMutation, useUsers } from '../api/hooks.js';
import { fmtDate } from '../lib.js';
import {
  Hammer,
  Coins,
  Gem,
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
  SlidersHorizontal,
  TrendingUp,
  Tag,
  KeyRound,
  Check,
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

const CATEGORY_TABS = [
  { key: 'all', label: 'All Masters', icon: Building2 },
  { key: 'karigar', label: 'Karigars & Artisans', icon: Hammer },
  { key: 'purity_rate', label: 'Bullion & Purity Rates', icon: Coins },
  { key: 'gemstone', label: 'Gemstones & Diamonds', icon: Gem },
  { key: 'vault_safe', label: 'Vaults & Lockers', icon: ShieldCheck },
];

export default function MastersPage() {
  const { isStaff, user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [rateModalItem, setRateModalItem] = useState(null);
  const [historyModalItem, setHistoryModalItem] = useState(null);

  // Forms
  const [newMaster, setNewMaster] = useState({
    category: 'karigar',
    code: '',
    name: '',
    description: '',
    // Karigar fields
    craftSpecialty: '',
    benchNumber: '',
    lossLimitPct: '0.9',
    mobile: '',
    // Purity fields
    metalType: 'Gold',
    purityPct: '91.67',
    currentRatePerGram: '',
    bisHallmarkCode: 'AU-916',
    // Gemstone fields
    stoneType: 'Diamond',
    defaultOrigin: '',
    defaultClarity: 'VVS-VS',
    certLab: 'GIA',
    // Vault fields
    safeLocation: '',
    securityLevel: 'Level 4 (Biometric)',
    biometricLockId: '',
    custodianName: '',
  });

  const [rateUpdateForm, setRateUpdateForm] = useState({
    newRate: '',
    notes: '',
  });

  const queryParams = useMemo(() => {
    const q = {};
    if (activeTab !== 'all') q.category = activeTab;
    if (statusFilter) q.isActive = statusFilter === 'active';
    if (search) q.search = search;
    return q;
  }, [activeTab, statusFilter, search]);

  const { data: listData, isLoading } = useList('masters', queryParams);
  const { data: stats } = useStats('masters', queryParams);
  const { create, act } = useResourceMutation('masters');

  const masters = listData?.items || [];

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    let details = {};

    if (newMaster.category === 'karigar') {
      details = {
        craftSpecialty: newMaster.craftSpecialty,
        benchNumber: newMaster.benchNumber,
        lossLimitPct: Number(newMaster.lossLimitPct),
        mobile: newMaster.mobile,
      };
    } else if (newMaster.category === 'purity_rate') {
      details = {
        metalType: newMaster.metalType,
        purityPct: Number(newMaster.purityPct),
        currentRatePerGram: Number(newMaster.currentRatePerGram),
        currency: 'INR',
        bisHallmarkCode: newMaster.bisHallmarkCode,
        lastUpdated: new Date(),
      };
    } else if (newMaster.category === 'gemstone') {
      details = {
        stoneType: newMaster.stoneType,
        defaultOrigin: newMaster.defaultOrigin,
        defaultClarity: newMaster.defaultClarity,
        certLab: newMaster.certLab,
      };
    } else if (newMaster.category === 'vault_safe') {
      details = {
        safeLocation: newMaster.safeLocation,
        securityLevel: newMaster.securityLevel,
        biometricLockId: newMaster.biometricLockId,
        custodianName: newMaster.custodianName,
      };
    }

    create.mutate(
      {
        category: newMaster.category,
        code: newMaster.code.toUpperCase(),
        name: newMaster.name,
        description: newMaster.description,
        details,
      },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setNewMaster({
            category: 'karigar',
            code: '',
            name: '',
            description: '',
            craftSpecialty: '',
            benchNumber: '',
            lossLimitPct: '0.9',
            mobile: '',
            metalType: 'Gold',
            purityPct: '91.67',
            currentRatePerGram: '',
            bisHallmarkCode: 'AU-916',
            stoneType: 'Diamond',
            defaultOrigin: '',
            defaultClarity: 'VVS-VS',
            certLab: 'GIA',
            safeLocation: '',
            securityLevel: 'Level 4 (Biometric)',
            biometricLockId: '',
            custodianName: '',
          });
        },
      }
    );
  };

  const handleToggleActive = (item) => {
    act.mutate({
      id: item._id,
      action: 'toggle-active',
    });
  };

  const handleRateUpdateSubmit = (e) => {
    e.preventDefault();
    if (!rateModalItem) return;
    act.mutate(
      {
        id: rateModalItem._id,
        action: 'update-rate',
        body: rateUpdateForm,
      },
      {
        onSuccess: () => {
          setRateModalItem(null);
          setRateUpdateForm({ newRate: '', notes: '' });
        },
      }
    );
  };

  const handleExportCSV = () => {
    if (!masters.length) return;
    const headers = ['Category', 'Code', 'Name', 'Description', 'Active Status', 'Last Updated'];
    const rows = masters.map((m) => [
      m.category,
      m.code,
      `"${m.name}"`,
      `"${m.description || ''}"`,
      m.isActive ? 'ACTIVE' : 'INACTIVE',
      m.updatedAt ? m.updatedAt.slice(0, 10) : '',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Masters_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <span className="text-gold-700 font-semibold">Masters</span>
          </nav>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-walnut-900 sm:text-3xl">
              Enterprise System Masters Configuration
            </h1>
            <span className="inline-flex items-center rounded-full bg-gold-500/10 px-2.5 py-0.5 text-xs font-semibold text-gold-800 border border-gold-500/20">
              System Settings
            </span>
          </div>
          <p className="mt-1 text-xs text-walnut-600">
            Karigar bench masters, daily bullion rates, gemstone certification profiles & biometric vault lockers.
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
              <span>Add Master Record</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Top Metric Cards (One per Category) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          onClick={() => setActiveTab('karigar')}
          className={`card p-4 cursor-pointer transition-all ${
            activeTab === 'karigar' ? 'ring-2 ring-gold-500 bg-gold-50/20' : 'hover:border-gold-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-walnut-700 uppercase tracking-wider">Karigar Artisans</span>
            <Hammer className="h-4 w-4 text-gold-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-walnut-900">
            {stats?.totalKarigars || 0}
          </div>
          <div className="mt-1 text-[11px] text-walnut-500">Active bench craftsmen</div>
        </div>

        <div
          onClick={() => setActiveTab('purity_rate')}
          className={`card p-4 cursor-pointer transition-all ${
            activeTab === 'purity_rate' ? 'ring-2 ring-gold-500 bg-gold-50/20' : 'hover:border-gold-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Bullion Rates</span>
            <Coins className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-amber-900">
            {stats?.totalPurityRates || 0}
          </div>
          <div className="mt-1 text-[11px] text-amber-700">BIS gold, silver & platinum</div>
        </div>

        <div
          onClick={() => setActiveTab('gemstone')}
          className={`card p-4 cursor-pointer transition-all ${
            activeTab === 'gemstone' ? 'ring-2 ring-gold-500 bg-gold-50/20' : 'hover:border-gold-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-900 uppercase tracking-wider">Gemstone Masters</span>
            <Gem className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-sky-900">
            {stats?.totalGemstones || 0}
          </div>
          <div className="mt-1 text-[11px] text-sky-700">GIA certified stone types</div>
        </div>

        <div
          onClick={() => setActiveTab('vault_safe')}
          className={`card p-4 cursor-pointer transition-all ${
            activeTab === 'vault_safe' ? 'ring-2 ring-gold-500 bg-gold-50/20' : 'hover:border-gold-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-leaf-900 uppercase tracking-wider">Vault Safes</span>
            <ShieldCheck className="h-4 w-4 text-leaf-600" />
          </div>
          <div className="mt-2 font-display text-2xl font-bold text-leaf-900">
            {stats?.totalVaults || 0}
          </div>
          <div className="mt-1 text-[11px] text-leaf-700">Biometric security safes</div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 border-b border-cream-200 pb-2 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-walnut-900 text-cream-50 shadow-sm'
                  : 'text-walnut-700 hover:bg-cream-100 hover:text-walnut-950'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Control Toolbar */}
      <div className="card p-4 space-y-3 bg-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut-400" />
            <input
              type="text"
              placeholder="Search master code, name, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full bg-cream-50/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-xs py-1.5 px-3 bg-cream-50/50"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Master Records Data Table */}
      <div className="card overflow-hidden border-cream-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-cream-100/70 text-walnut-800 uppercase font-semibold text-[11px] tracking-wider border-b border-cream-200">
              <tr>
                <th className="py-3 px-4">Master Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Name & Specifications</th>
                <th className="py-3 px-4">Configuration Details</th>
                <th className="py-3 px-4 text-center">Active Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-100">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-walnut-500">
                    Loading master settings...
                  </td>
                </tr>
              ) : masters.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-walnut-500">
                    No master records found. Click "+ Add Master Record" above to configure.
                  </td>
                </tr>
              ) : (
                masters.map((m) => {
                  const isKarigar = m.category === 'karigar';
                  const isPurity = m.category === 'purity_rate';
                  const isGem = m.category === 'gemstone';
                  const isVault = m.category === 'vault_safe';

                  return (
                    <tr key={m._id} className="hover:bg-cream-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-gold-800">
                        {m.code}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-cream-200 text-walnut-800 capitalize">
                          {m.category?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-walnut-900">{m.name}</div>
                        {m.description && (
                          <div className="text-[11px] text-walnut-500 line-clamp-1">{m.description}</div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[11px]">
                        {isKarigar && (
                          <div className="space-y-0.5">
                            <div>Specialty: <span className="font-medium text-walnut-800">{m.details?.craftSpecialty}</span></div>
                            <div className="text-walnut-500">Bench: {m.details?.benchNumber} | Loss Limit: {m.details?.lossLimitPct}%</div>
                          </div>
                        )}

                        {isPurity && (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-gold-800 text-sm">
                              {fmtINR(m.details?.currentRatePerGram)} <span className="text-[10px] font-sans font-normal text-walnut-500">/ gram</span>
                            </div>
                            <div className="text-walnut-500 font-mono text-[10px]">
                              Purity: {m.details?.purityPct}% • Hallmark: {m.details?.bisHallmarkCode}
                            </div>
                          </div>
                        )}

                        {isGem && (
                          <div className="space-y-0.5">
                            <div>Origin: <span className="font-medium text-walnut-800">{m.details?.defaultOrigin}</span></div>
                            <div className="text-walnut-500">Clarity: {m.details?.defaultClarity} • Lab: {m.details?.certLab}</div>
                          </div>
                        )}

                        {isVault && (
                          <div className="space-y-0.5">
                            <div>Location: <span className="font-medium text-walnut-800">{m.details?.safeLocation}</span></div>
                            <div className="text-walnut-500 font-mono text-[10px]">
                              {m.details?.securityLevel} • Custodian: {m.details?.custodianName}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(m)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                            m.isActive
                              ? 'bg-leaf-100 text-leaf-800 border-leaf-300'
                              : 'bg-cream-200 text-walnut-600 border-cream-300'
                          }`}
                        >
                          {m.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isPurity && isStaff && (
                            <button
                              onClick={() => {
                                setRateModalItem(m);
                                setRateUpdateForm({
                                  newRate: m.details?.currentRatePerGram || '',
                                  notes: '',
                                });
                              }}
                              className="btn-ghost flex items-center gap-1 py-1 px-2 text-[10px] border border-gold-300 text-gold-900 hover:bg-gold-50"
                              title="Update Daily Market Rate"
                            >
                              <Coins className="h-3.5 w-3.5 text-gold-700" />
                              <span>Update Rate</span>
                            </button>
                          )}

                          <button
                            onClick={() => setHistoryModalItem(m)}
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

      {/* MODAL 1: ADD MASTER RECORD */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-xl bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Configure System Master Record
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
                  <label className="block font-semibold text-walnut-800 mb-1">Master Category *</label>
                  <select
                    value={newMaster.category}
                    onChange={(e) => setNewMaster({ ...newMaster, category: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="karigar">Karigar & Artisan Bench</option>
                    <option value="purity_rate">Bullion & Purity Rate</option>
                    <option value="gemstone">Gemstone & Diamond Type</option>
                    <option value="vault_safe">Vault Safe & Compartment</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-walnut-800 mb-1">Master Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KRG-006 or PUR-20K"
                    value={newMaster.code}
                    onChange={(e) => setNewMaster({ ...newMaster, code: e.target.value })}
                    className="input w-full text-xs uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Master Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Jewellers Setter or 20K Fine Gold"
                  value={newMaster.name}
                  onChange={(e) => setNewMaster({ ...newMaster, name: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              {/* Dynamic Category Fields */}
              {newMaster.category === 'karigar' && (
                <div className="p-3 rounded-lg bg-cream-50 border border-cream-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Craft Specialty</label>
                      <input
                        type="text"
                        placeholder="e.g. Prong & Illusion Setting"
                        value={newMaster.craftSpecialty}
                        onChange={(e) => setNewMaster({ ...newMaster, craftSpecialty: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Bench / Station #</label>
                      <input
                        type="text"
                        placeholder="Bench #12"
                        value={newMaster.benchNumber}
                        onChange={(e) => setNewMaster({ ...newMaster, benchNumber: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Metal Loss Tolerance (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={newMaster.lossLimitPct}
                        onChange={(e) => setNewMaster({ ...newMaster, lossLimitPct: e.target.value })}
                        className="input w-full text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Artisan Mobile</label>
                      <input
                        type="text"
                        placeholder="+91 98200 00000"
                        value={newMaster.mobile}
                        onChange={(e) => setNewMaster({ ...newMaster, mobile: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newMaster.category === 'purity_rate' && (
                <div className="p-3 rounded-lg bg-cream-50 border border-cream-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Metal Type</label>
                      <select
                        value={newMaster.metalType}
                        onChange={(e) => setNewMaster({ ...newMaster, metalType: e.target.value })}
                        className="input w-full text-xs"
                      >
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                        <option value="Silver">Silver</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Purity (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newMaster.purityPct}
                        onChange={(e) => setNewMaster({ ...newMaster, purityPct: e.target.value })}
                        className="input w-full text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Current Rate (₹/g) *</label>
                      <input
                        type="number"
                        step="1"
                        required
                        placeholder="7380"
                        value={newMaster.currentRatePerGram}
                        onChange={(e) => setNewMaster({ ...newMaster, currentRatePerGram: e.target.value })}
                        className="input w-full text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newMaster.category === 'gemstone' && (
                <div className="p-3 rounded-lg bg-cream-50 border border-cream-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Stone Type</label>
                      <input
                        type="text"
                        placeholder="e.g. Tanzanite"
                        value={newMaster.stoneType}
                        onChange={(e) => setNewMaster({ ...newMaster, stoneType: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Default Origin</label>
                      <input
                        type="text"
                        placeholder="e.g. Merelani, Tanzania"
                        value={newMaster.defaultOrigin}
                        onChange={(e) => setNewMaster({ ...newMaster, defaultOrigin: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Certifying Lab</label>
                      <input
                        type="text"
                        placeholder="e.g. GIA / GRS"
                        value={newMaster.certLab}
                        onChange={(e) => setNewMaster({ ...newMaster, certLab: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {newMaster.category === 'vault_safe' && (
                <div className="p-3 rounded-lg bg-cream-50 border border-cream-200 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Safe Location</label>
                      <input
                        type="text"
                        placeholder="Sub-Level Central Vault Room"
                        value={newMaster.safeLocation}
                        onChange={(e) => setNewMaster({ ...newMaster, safeLocation: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-walnut-800 mb-1">Custodian Lead</label>
                      <input
                        type="text"
                        placeholder="Rahul Yadav"
                        value={newMaster.custodianName}
                        onChange={(e) => setNewMaster({ ...newMaster, custodianName: e.target.value })}
                        className="input w-full text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Description & Guidelines</label>
                <textarea
                  rows="2"
                  placeholder="Master specifications and operational notes..."
                  value={newMaster.description}
                  onChange={(e) => setNewMaster({ ...newMaster, description: e.target.value })}
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
                  {create.isPending ? 'Saving...' : 'Add Master Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: UPDATE BULLION MARKET RATE */}
      {rateModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-walnut-950/60 p-4 backdrop-blur-sm overflow-y-auto overscroll-contain"
        >
          <div className="card w-full max-w-md bg-white p-6 shadow-2xl border-cream-300">
            <div className="flex items-center justify-between pb-3 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-gold-600" />
                <h3 className="font-display text-lg font-semibold text-walnut-900">
                  Update Bullion Market Rate
                </h3>
              </div>
              <button
                onClick={() => setRateModalItem(null)}
                className="text-walnut-400 hover:text-walnut-700 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded bg-cream-100 text-xs text-walnut-800 space-y-1">
              <div className="font-semibold text-gold-800">{rateModalItem.name} ({rateModalItem.code})</div>
              <div>Current Active Rate: {fmtINR(rateModalItem.details?.currentRatePerGram)} / gram</div>
            </div>

            <form onSubmit={handleRateUpdateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-walnut-800 mb-1">
                  New Rate per Gram (₹) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 7420"
                  value={rateUpdateForm.newRate}
                  onChange={(e) => setRateUpdateForm({ ...rateUpdateForm, newRate: e.target.value })}
                  className="input w-full text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-walnut-800 mb-1">Adjustment Notes / Index Source</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Updated based on Mumbai Zaveri Bazaar morning spot opening."
                  value={rateUpdateForm.notes}
                  onChange={(e) => setRateUpdateForm({ ...rateUpdateForm, notes: e.target.value })}
                  className="input w-full text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream-200">
                <button
                  type="button"
                  onClick={() => setRateModalItem(null)}
                  className="btn-ghost text-xs text-walnut-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={act.isPending}
                  className="btn-primary text-xs shadow-gold"
                >
                  {act.isPending ? 'Updating...' : 'Publish Rate Update'}
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
                  Master Record Audit Trail
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
              <div className="font-semibold text-gold-800">{historyModalItem.code}</div>
              <div>{historyModalItem.name} ({historyModalItem.category})</div>
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
                    By: {step.performedByName || 'System Admin'}
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
