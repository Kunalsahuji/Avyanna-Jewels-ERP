import React, { useEffect, Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import { PageSkeleton, ErrorBoundary } from './components/Skeletons.jsx';
import ModulePage from './components/ModulePage.jsx';
import ModulePlaceholder from './components/ModulePlaceholder.jsx';
import { modules, placeholderModules } from './modules.config.jsx';

// Code-split route pages with lazy loading
const Login = lazy(() => import('./pages/Login.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const DelegationPage = lazy(() => import('./pages/DelegationPage.jsx'));
const ChecklistPage = lazy(() => import('./pages/ChecklistPage.jsx'));
const TicketsPage = lazy(() => import('./pages/TicketsPage.jsx'));
const StockManagementPage = lazy(() => import('./pages/StockManagementPage.jsx'));
const CityTransferApprovalPage = lazy(() => import('./pages/CityTransferApprovalPage.jsx'));
const ProductionFmsPage = lazy(() => import('./pages/ProductionFmsPage.jsx'));
const SupplierFmsPage = lazy(() => import('./pages/SupplierFmsPage.jsx'));
const ExhibitionFmsPage = lazy(() => import('./pages/ExhibitionFmsPage.jsx'));
const PreExhibitionFmsPage = lazy(() => import('./pages/PreExhibitionFmsPage.jsx'));
const AttendancePage = lazy(() => import('./pages/AttendancePage.jsx'));
const MisScoringPage = lazy(() => import('./pages/MisScoringPage.jsx'));
const MastersPage = lazy(() => import('./pages/MastersPage.jsx'));

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 p-6 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-gold-400 border-t-gold-600 rounded-full animate-spin"></div>
        <p className="text-xs font-semibold tracking-wider uppercase text-walnut-700">Loading Tvisha ERP…</p>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  // Global modal scroll lock: prevent background page scrolling whenever any modal/popup is open
  useEffect(() => {
    const handleScrollLock = () => {
      const hasModal = !!document.querySelector(
        '.fixed.inset-0, [role="dialog"], [aria-modal="true"], .modal-backdrop'
      );
      if (hasModal) {
        document.body.classList.add('modal-open');
      } else {
        document.body.classList.remove('modal-open');
      }
    };

    const observer = new MutationObserver(handleScrollLock);
    observer.observe(document.body, { childList: true, subtree: true });
    handleScrollLock();

    return () => {
      observer.disconnect();
      document.body.classList.remove('modal-open');
    };
  }, []);

  const genericModules = modules.filter(
    (m) =>
      m.path !== 'checklist' &&
      m.path !== 'account-checklist' &&
      m.path !== 'delegation' &&
      m.path !== 'tickets'
  );

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="p-6 bg-cream-50 min-h-screen">
            <PageSkeleton />
          </div>
        }
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protected>
                <AppShell />
              </Protected>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="delegation" element={<DelegationPage />} />
            <Route path="checklist" element={<ChecklistPage category="general" title="Checklist" />} />
            <Route path="account-checklist" element={<ChecklistPage category="account" title="Account Checklist" />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="stock-management" element={<StockManagementPage />} />
            <Route path="city-transfer-approval" element={<CityTransferApprovalPage />} />
            <Route path="production-fms" element={<ProductionFmsPage />} />
            <Route path="supplier-fms" element={<SupplierFmsPage />} />
            <Route path="exhibition-fms" element={<ExhibitionFmsPage />} />
            <Route path="pre-exhibition-fms" element={<PreExhibitionFmsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="mis-scoring" element={<MisScoringPage />} />
            <Route path="masters" element={<MastersPage />} />
            {genericModules.map((m) => (
              <Route key={m.path} path={m.path} element={<ModulePage config={m} />} />
            ))}
            {placeholderModules.map((p) => (
              <Route
                key={p.path}
                path={p.path}
                element={<ModulePlaceholder title={p.title} description={p.description} />}
              />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
