import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DelegationPage from './pages/DelegationPage.jsx';
import ChecklistPage from './pages/ChecklistPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import StockManagementPage from './pages/StockManagementPage.jsx';
import ModulePage from './components/ModulePage.jsx';
import ModulePlaceholder from './components/ModulePlaceholder.jsx';
import { modules, placeholderModules } from './modules.config.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center p-10 text-sm font-semibold text-walnut-700">Loading Tvisha ERP…</div>;
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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="delegation" element={<DelegationPage />} />
        <Route path="checklist" element={<ChecklistPage category="general" title="Checklist" />} />
        <Route path="account-checklist" element={<ChecklistPage category="account" title="Account Checklist" />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="stock-management" element={<StockManagementPage />} />
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
  );
}
