import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.userMessage || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1f1409] p-4">
      <div className="card w-full max-w-md border border-gold-500/20 bg-white p-8 shadow-2xl">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-700 text-walnut-950 shadow-md">
            <span className="font-display text-2xl font-bold italic tracking-tight">AV</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-wider text-walnut-950">AVYANNA JEWELS</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-gold-600">Enterprise ERP System</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email Address</label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                placeholder="name@avyannajewels.com"
                className="input pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-walnut-400" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="input pl-9 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-walnut-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-walnut-400 transition hover:text-gold-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-brick-500/20 bg-brick-500/10 p-3 text-xs font-medium text-brick-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-2.5 text-sm tracking-wide shadow-md transition hover:bg-walnut-700"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign In to ERP'}
          </button>
        </form>
      </div>
    </div>
  );
}
