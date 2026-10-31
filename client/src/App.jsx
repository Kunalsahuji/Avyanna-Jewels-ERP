import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ChecklistPage from './pages/ChecklistPage.jsx';
import ModulePage from './components/ModulePage.jsx';
import ModulePlaceholder from './components/ModulePlaceholder.jsx';
import { modules, placeholderModules } from './modules.config.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center p-10 text-sm font-semibold text-walnut-700">Loading Tvisha ERP…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const genericModules = modules.filter(
    (m) => m.path !== 'checklist' && m.path !== 'account-checklist'
  );

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="checklist" element={<ChecklistPage category="general" title="Checklist" />} />
        <Route path="account-checklist" element={<ChecklistPage category="account" title="Account Checklist" />} />
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
