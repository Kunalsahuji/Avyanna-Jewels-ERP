// routeLoaders.js - Intelligent prefetching and route chunk management
export const routeModules = {
  login: () => import('./pages/Login.jsx'),
  dashboard: () => import('./pages/Dashboard.jsx'),
  delegation: () => import('./pages/DelegationPage.jsx'),
  checklist: () => import('./pages/ChecklistPage.jsx'),
  'account-checklist': () => import('./pages/ChecklistPage.jsx'),
  tickets: () => import('./pages/TicketsPage.jsx'),
  'stock-management': () => import('./pages/StockManagementPage.jsx'),
  'city-transfer-approval': () => import('./pages/CityTransferApprovalPage.jsx'),
  'production-fms': () => import('./pages/ProductionFmsPage.jsx'),
  'supplier-fms': () => import('./pages/SupplierFmsPage.jsx'),
  'exhibition-fms': () => import('./pages/ExhibitionFmsPage.jsx'),
  'pre-exhibition-fms': () => import('./pages/PreExhibitionFmsPage.jsx'),
  attendance: () => import('./pages/AttendancePage.jsx'),
  'mis-scoring': () => import('./pages/MisScoringPage.jsx'),
  masters: () => import('./pages/MastersPage.jsx'),
};

const preloadedRoutes = new Set();

/**
 * Preloads a route component into browser memory.
 * Idempotent: Subsequent calls for the same route return the cached promise.
 */
export function preloadRoute(path) {
  if (!path) return;
  const cleanKey = path.replace(/^\//, '').split('/')[0];
  const loader = routeModules[cleanKey];
  if (loader && !preloadedRoutes.has(cleanKey)) {
    preloadedRoutes.add(cleanKey);
    loader().catch(() => preloadedRoutes.delete(cleanKey));
  }
}

/**
 * Idle-time preloader for high-frequency ERP modules.
 * Runs in background after initial page load without affecting main-thread performance.
 */
export function preloadCoreRoutes() {
  if (typeof window === 'undefined') return;
  const scheduleIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 1200));
  scheduleIdle(() => {
    ['dashboard', 'delegation', 'checklist', 'tickets', 'stock-management'].forEach(preloadRoute);
  });
}
