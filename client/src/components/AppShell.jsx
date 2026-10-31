import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  ClipboardList,
  CheckSquare,
  FileText,
  MessageSquare,
  BarChart2,
  Gem,
  Calendar,
  Clock,
  Package,
  ArrowRightLeft,
  Grid,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown
} from 'lucide-react';

export const NAV_ITEMS = [
  { path: 'dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { path: 'delegation', title: 'Delegation', icon: ClipboardList },
  { path: 'checklist', title: 'Checklist', icon: CheckSquare },
  { path: 'account-checklist', title: 'Account Checklist', icon: FileText },
  { path: 'tickets', title: 'Help Ticket', icon: MessageSquare },
  { path: 'mis-scoring', title: 'MIS Scoring', icon: BarChart2 },
  { path: 'production-fms', title: 'Production FMS', icon: Gem, hasSubmenu: true },
  { path: 'supplier-fms', title: 'Supplier FMS', icon: Gem },
  { path: 'exhibition-fms', title: 'Exhibition FMS', icon: Calendar },
  { path: 'pre-exhibition-fms', title: 'Pre Exhibition FMS', icon: Clock },
  { path: 'stock-management', title: 'Stock Management', icon: Package },
  { path: 'city-transfer-approval', title: 'City Transfer Approval', icon: ArrowRightLeft },
  { path: 'attendance', title: 'Attendance', icon: Clock },
  { path: 'masters', title: 'Masters', icon: Grid, hasSubmenu: true },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Match current nav title
  const currentNav = NAV_ITEMS.find((n) => pathname.startsWith(`/${n.path}`)) || { title: 'Dashboard' };

  const initials = (user?.name || 'User')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-cream-50 font-sans text-walnut-800">
      {/* Sidebar */}
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col bg-[#21160d] text-cream-100 transition-all duration-300 md:flex ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-walnut-800/80 px-4 py-5">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 text-walnut-950 shadow-md">
                <span className="font-display text-xl font-bold italic tracking-tight">TJ</span>
              </div>
              <div>
                <span className="block font-display text-lg font-bold tracking-widest text-cream-50">TVISHA JEWLZ</span>
                <span className="block text-[10px] tracking-widest text-gold-400/80 uppercase">Enterprise ERP</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-gold-500 text-walnut-950 font-bold">
              TJ
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1.5 text-cream-200/60 hover:bg-walnut-800 hover:text-gold-400"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar px-3 py-3 text-xs">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={`/${item.path}`}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-lg px-3 py-2.5 font-medium transition ${
                    isActive
                      ? 'border-l-4 border-gold-500 bg-[#2d1e12] text-gold-400 font-semibold shadow-sm'
                      : 'border-l-4 border-transparent text-cream-100/75 hover:bg-walnut-800/80 hover:text-cream-50'
                  }`
                }
                title={collapsed ? item.title : undefined}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 transition group-hover:scale-105" />
                  {!collapsed && <span className="truncate tracking-wide">{item.title}</span>}
                </div>
                {!collapsed && item.hasSubmenu && (
                  <ChevronRight className="h-3.5 w-3.5 text-cream-200/40" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="border-t border-walnut-800/80 p-3">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-walnut-800/70"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-walnut-950 shadow">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-cream-100">{user?.name || 'User'}</p>
                  <p className="text-[11px] capitalize text-gold-400/80">{user?.role || 'Staff'}</p>
                </div>
              )}
              {!collapsed && <ChevronDown className="h-4 w-4 text-cream-200/50" />}
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-lg border border-gold-500/20 bg-[#271b10] p-1 shadow-lg">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs font-medium text-cream-100 hover:bg-walnut-800 hover:text-brick-400"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-cream-200/80 bg-white/95 px-6 backdrop-blur-sm">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-medium text-walnut-700/80">
            <span className="hover:text-walnut-900">Tvisha ERP</span>
            <span className="text-walnut-400">&gt;</span>
            <span className="font-semibold text-walnut-950">{currentNav.title}</span>
          </div>

          {/* User Role Pill */}
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-gold-500/30 bg-gold-400/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-700">
              {user?.role || 'STAFF'}
            </span>
          </div>
        </header>

        {/* Mobile Horizontal Nav */}
        <nav className="flex gap-2 overflow-x-auto no-scrollbar border-b border-cream-200 bg-white p-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={`/${item.path}`}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  isActive ? 'bg-walnut-800 text-gold-400' : 'bg-cream-100 text-walnut-700'
                }`
              }
            >
              {item.title}
            </NavLink>
          ))}
        </nav>

        {/* Content View */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
