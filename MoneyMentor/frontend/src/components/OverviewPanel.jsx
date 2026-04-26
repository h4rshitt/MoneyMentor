import { useState, useEffect } from 'react';
import { CreditCard, Bell, Zap, FolderOpen, Sparkles, Brain, TrendingUp, ChevronRight, Info } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../api/client';
import { fmt, SERVICE_COLORS } from './shared';
import SubsTable from './SubsTable';

const CATEGORY_COLORS = {
  'Food & Dining':    '#f59e0b',
  'Entertainment':    '#8b5cf6',
  'Transport':        '#3b82f6',
  'Shopping':         '#ec4899',
  'Health & Fitness': '#10b981',
  'Utilities & Bills':'#06b6d4',
  'Subscriptions':    '#7c3aed',
  'Income':           '#22c55e',
  'Other':            '#a1a1aa',
};

/* ── Health Score gauge + tooltip explanation ──────────────────────────────── */
function HealthGauge({ score, label, color }) {
  const [showInfo, setShowInfo] = useState(false);
  const C = {
    emerald: { arc: '#10b981', text: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/30' },
    blue:    { arc: '#7c3aed', text: 'text-brand-600',   bg: 'bg-brand-50 dark:bg-brand-950/20',     border: 'border-brand-200 dark:border-brand-900/30' },
    amber:   { arc: '#f59e0b', text: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-950/20',     border: 'border-amber-200 dark:border-amber-900/30' },
    red:     { arc: '#ef4444', text: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/20',         border: 'border-red-200 dark:border-red-900/30' },
  }[color] || { arc: '#7c3aed', text: 'text-brand-600', bg: 'bg-brand-50 dark:bg-brand-950/20', border: 'border-brand-200 dark:border-brand-900/30' };

  const circ = 2 * Math.PI * 15.9;
  const dash = (score / 100) * circ;

  const bands = [
    { range: '75–100', label: 'Excellent', desc: 'Subscriptions < 12.5% of spending, ≤ 3 services', color: 'bg-emerald-500' },
    { range: '50–74',  label: 'Good',      desc: 'Subscriptions < 25% of spending, ≤ 6 services',   color: 'bg-brand-500' },
    { range: '25–49',  label: 'Fair',      desc: 'Subscriptions eating a notable budget slice',        color: 'bg-amber-500' },
    { range: '0–24',   label: 'Review',    desc: 'Subscriptions > 37.5% of spending or many services', color: 'bg-red-500' },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[88px] h-[88px]">
        <svg className="w-[88px] h-[88px] -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
            className="text-zinc-100 dark:text-white/[0.06]" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={C.arc} strokeWidth="2.5"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.7s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-[18px] font-semibold font-mono tabular-nums ${C.text}`}>{score}</span>
          <span className="text-[9px] text-zinc-400 font-mono">/100</span>
        </div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <p className={`text-[11px] font-semibold ${C.text}`}>{label}</p>
          <button onClick={() => setShowInfo(v => !v)}
            className="text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 transition-colors">
            <Info className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 font-mono">Subscription Health</p>
      </div>

      {showInfo && (
        <div className="w-full text-[10px] rounded-lg border border-zinc-100 dark:border-white/[0.06] overflow-hidden animate-fade-in">
          <div className="px-3 py-2 bg-zinc-50 dark:bg-white/[0.03] border-b border-zinc-100 dark:border-white/[0.05]">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">How it's calculated</p>
            <p className="text-zinc-400 mt-0.5">Score = 100 − subscription % of spend × 2 − (subs − 3) × 5</p>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.04]">
            {bands.map(b => (
              <div key={b.range} className="flex items-start gap-2 px-3 py-1.5">
                <span className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${b.color}`} />
                <div>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">{b.range} — {b.label}: </span>
                  <span className="text-zinc-400">{b.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AI Insights card ─────────────────────────────────────────────────────── */
function InsightsCard({ activeFileId, currency }) {
  const [insights, setInsights] = useState([]);
  const [source, setSource]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [loaded, setLoaded]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getSpendingInsights(activeFileId, currency);
      setInsights(res.data.insights || []);
      setSource(res.data.source || '');
      setLoaded(true);
    } catch { setLoaded(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoaded(false); setInsights([]); }, [activeFileId, currency]);

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">AI Insights</span>
          {source === 'groq'   && <span className="badge-violet">⚡ Groq</span>}
          {source === 'gemini' && <span className="badge-violet">✨ Gemini</span>}
        </div>
        {!loaded && (
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 disabled:opacity-50 transition-colors">
            {loading
              ? <span className="w-3 h-3 border border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
              : <Sparkles className="w-3 h-3" />}
            {loading ? 'Analysing…' : 'Analyse'}
          </button>
        )}
      </div>

      {!loaded && !loading && (
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Click <strong className="text-zinc-500">Analyse</strong> for AI-powered insights on your spending patterns.
        </p>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-zinc-400 text-[12px] py-1">
          <div className="w-3.5 h-3.5 border-2 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
          Generating insights…
        </div>
      )}
      {loaded && insights.length > 0 && (
        <ul className="space-y-2.5 flex-1">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2 text-[12px] text-zinc-700 dark:text-zinc-300">
              <TrendingUp className="w-3 h-3 text-brand-500 flex-shrink-0 mt-0.5" />
              {insight}
            </li>
          ))}
        </ul>
      )}
      {loaded && insights.length === 0 && (
        <p className="text-[11px] text-zinc-400">No insights available — upload more transaction data.</p>
      )}
    </div>
  );
}

/* ── Custom chart tooltip ─────────────────────────────────────────────────── */
const ChartTip = ({ active, payload, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#1a1a1f] border border-zinc-200 dark:border-white/[0.08] rounded-lg px-3 py-2 shadow-sm text-[11px]">
      <p className="font-semibold text-zinc-900 dark:text-white">{payload[0].name}</p>
      <p className="text-zinc-500 font-mono">{fmt(payload[0].value, currency)}</p>
    </div>
  );
};

/* ── Main panel ───────────────────────────────────────────────────────────── */
export default function OverviewPanel({ summary, subscriptions, currency, activeFileId, onNavigate, onNegotiate, categoryData }) {
  const pieData = subscriptions.map((s, i) => ({
    name: s.name, value: s.monthly_cost, color: SERVICE_COLORS[i % SERVICE_COLORS.length],
  }));
  const catPieData = (categoryData?.categories || [])
    .filter(c => c.category !== 'Income').slice(0, 8)
    .map(c => ({ name: c.category, value: c.amount, color: CATEGORY_COLORS[c.category] || '#a1a1aa' }));

  if (!subscriptions.length) {
    return (
      <div className="animate-fade-in">
        <div className="card border-dashed border-2 border-zinc-200 dark:border-white/[0.08] text-center py-16 max-w-md">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-white/[0.05] rounded-xl mx-auto flex items-center justify-center mb-4">
            <FolderOpen className="w-5 h-5 text-zinc-400" />
          </div>
          <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-white mb-1.5">Upload your first statement</h3>
          <p className="text-zinc-400 text-[12px] mb-5 max-w-xs mx-auto leading-relaxed">
            Drop a bank statement CSV to detect subscriptions, track spending, and get AI insights.
          </p>
          <button onClick={() => onNavigate('files')} className="btn-primary text-[12px]">
            Upload CSV <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Stat row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Monthly subs */}
        <div className="card flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-brand-50 dark:bg-brand-950/30 rounded-md flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-brand-600" />
            </div>
            <span className="section-label">Monthly</span>
          </div>
          <p className="text-[22px] font-semibold font-mono tabular-nums text-zinc-900 dark:text-white tracking-tight">
            {fmt(summary.total_monthly_cost, currency)}
          </p>
          <p className="text-[11px] text-zinc-400 font-mono">{fmt(summary.annual_cost, currency)} / year</p>
        </div>

        {/* Active subs */}
        <div className="card flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-zinc-100 dark:bg-white/[0.06] rounded-md flex items-center justify-center">
              <Bell className="w-3 h-3 text-zinc-500" />
            </div>
            <span className="section-label">Services</span>
          </div>
          <p className="text-[22px] font-semibold font-mono tabular-nums text-zinc-900 dark:text-white tracking-tight">
            {summary.subscription_count}
          </p>
          <p className="text-[11px] text-zinc-400">Recurring detected</p>
        </div>

        {/* Savings */}
        <div className="card flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-md flex items-center justify-center">
              <Zap className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="section-label">Est. Savings</span>
          </div>
          <p className="text-[22px] font-semibold font-mono tabular-nums text-zinc-900 dark:text-white tracking-tight">
            {fmt(summary.annual_cost * 0.3, currency)}
          </p>
          <p className="text-[11px] text-zinc-400">If you cut 30% of subs</p>
        </div>

        {/* Health gauge */}
        <div className="card flex items-center justify-center py-4">
          <HealthGauge score={summary.health_score ?? 0} label={summary.health_label ?? 'N/A'} color={summary.health_color ?? 'blue'} />
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-[12px] font-semibold text-zinc-900 dark:text-white mb-4">Subscription Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie dataKey="value" data={pieData} cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                labelLine={false} fontSize={10}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={(p) => <ChartTip {...p} currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {catPieData.length > 0 ? (
          <div className="card">
            <h3 className="text-[12px] font-semibold text-zinc-900 dark:text-white mb-4">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie dataKey="value" data={catPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent*100).toFixed(0)}%`}
                  labelLine={false} fontSize={10}>
                  {catPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={(p) => <ChartTip {...p} currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-[12px] text-zinc-400">
            No category data yet
          </div>
        )}
      </div>

      {/* ── AI insights + top subs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <InsightsCard activeFileId={activeFileId} currency={currency} />
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-semibold text-zinc-900 dark:text-white">Top Subscriptions</h3>
            <button onClick={() => onNavigate('subscriptions')}
              className="flex items-center gap-0.5 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <SubsTable subscriptions={subscriptions.slice(0, 4)} currency={currency} onNegotiate={onNegotiate} />
        </div>
      </div>
    </div>
  );
}
