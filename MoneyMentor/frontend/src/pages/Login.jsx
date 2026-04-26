import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as loginAPI } from '../api/client';
import { Eye, EyeOff, ArrowRight, TrendingUp, Shield, Zap, LineChart } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = 'http://localhost:8000';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const STATS = [
  { icon: Shield,    label: 'Bank-grade security',         value: '256-bit SSL' },
  { icon: Zap,       label: 'Subscriptions detected',      value: 'Instant' },
  { icon: LineChart, label: 'Avg. savings identified',     value: '$420 / yr' },
];

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await loginAPI(form);
      login(res.data.access_token, { name: res.data.user_name, email: res.data.user_email });
      toast.success(`Welcome back, ${res.data.user_name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] bg-brand-gradient p-12 relative overflow-hidden">
        {/* Orbs */}
        <div className="orb absolute top-[-80px] right-[-60px] w-[420px] h-[420px] rounded-full opacity-20"
             style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
        <div className="orb-delay absolute bottom-[-100px] left-[-80px] w-[380px] h-[380px] rounded-full opacity-15"
             style={{ background: 'radial-gradient(circle, #c4b5fd, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">MoneyMentor</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10">
          <p className="text-brand-200 text-sm font-semibold uppercase tracking-widest mb-4">AI Finance Intelligence</p>
          <h1 className="text-5xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            Stop paying for things<br />you forgot about.
          </h1>
          <p className="text-brand-200 text-lg leading-relaxed mb-10 max-w-sm">
            Upload your bank statement and MoneyMentor instantly detects every subscription, hidden charge, and recurring expense.
          </p>

          {/* Stats */}
          <div className="space-y-4">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{value}</p>
                  <p className="text-brand-300 text-xs">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-brand-400 text-xs">© 2026 MoneyMentor. All rights reserved.</p>
      </div>

      {/* ── Right panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#f7f9ff] dark:bg-surface-950">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-9 h-9 bg-brand-gradient rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">MoneyMentor</span>
        </div>

        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1.5">Sign in</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm">Welcome back — your finances are waiting.</p>
          </div>

          {/* Google */}
          <button
            onClick={() => window.location.href = `${BACKEND_URL}/auth/google`}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-surface-800 border border-gray-200 dark:border-white/10 rounded-xl font-semibold text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-surface-700 hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 shadow-sm mb-5"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.07]" />
            <span className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-widest font-medium">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.07]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Email address
              </label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field pr-11"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-1 text-sm font-semibold">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
            No account?{' '}
            <Link to="/signup" className="text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
