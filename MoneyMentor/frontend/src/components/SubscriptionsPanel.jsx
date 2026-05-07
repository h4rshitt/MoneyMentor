import { CreditCard, TrendingDown, Hash, Info } from 'lucide-react';
import { useState } from 'react';
import { fmt } from './shared';
import SubsTable from './SubsTable';

const HEALTH = {
  emerald: { arc: '#10b981', text: 'text-emerald-600 dark:text-emerald-400', tip: 'Great — subscriptions are a small % of your spending.' },
  blue:    { arc: '#7c3aed', text: 'text-brand-600 dark:text-brand-400',     tip: 'Good shape. Consider reviewing rarely-used services.' },
  amber:   { arc: '#f59e0b', text: 'text-amber-600 dark:text-amber-400',     tip: 'Subscriptions are eating a notable slice of budget.' },
  red:     { arc: '#ef4444', text: 'text-red-600 dark:text-red-400',         tip: 'Subscriptions are a large % of spending — cancel unused ones.' },
};

function HealthGauge({ score, label, color }) {
  const [showInfo, setShowInfo] = useState(false);
  const c = HEALTH[color] || HEALTH.blue;
  const circ = 2 * Math.PI * 15.9;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor"
            className="text-zinc-100 dark:text-white/[0.06]" strokeWidth="2.5" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={c.arc} strokeWidth="2.5"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-semibold font-mono tabular-nums ${c.text}`}>{score}</span>
          <span className="text-[10px] text-zinc-400 font-mono">/100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <p className={`text-[13px] font-semibold ${c.text}`}>{label}</p>
          <button onClick={() => setShowInfo(v => !v)}
            className="text-zinc-300 hover:text-zinc-500 transition-colors">
            <Info className="w-3 h-3" />
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 font-mono">Subscription Health Score</p>
        {showInfo && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed max-w-[160px]">{c.tip}</p>
        )}
      </div>
    </div>
  );
}

export default function SubscriptionsPanel({ summary, subscriptions, onNegotiate }) {
  const color = summary.health_color || 'blue';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-brand-50 dark:bg-brand-950/25 rounded-md flex items-center justify-center">
              <CreditCard className="w-3 h-3 text-brand-600" />
            </div>
            <span className="section-label">Monthly Total</span>
          </div>
          <p className="text-[26px] font-semibold font-mono tabular-nums text-zinc-900 dark:text-white tracking-tight">
            {fmt(summary.total_monthly_cost)}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-emerald-50 dark:bg-emerald-950/25 rounded-md flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="section-label">Annual Total</span>
          </div>
          <p className="text-[26px] font-semibold font-mono tabular-nums text-zinc-900 dark:text-white tracking-tight">
            {fmt(summary.annual_cost)}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-zinc-100 dark:bg-white/[0.06] rounded-md flex items-center justify-center">
              <Hash className="w-3 h-3 text-zinc-500" />
            </div>
            <span className="section-label">Active Services</span>
          </div>
          <p className="text-[26px] font-semibold font-mono tabular-nums text-zinc-900 dark:text-white tracking-tight">
            {summary.subscription_count}
          </p>
        </div>
      </div>

      {/* Health + table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="card flex items-center justify-center py-8 lg:col-span-1">
          <HealthGauge score={summary.health_score ?? 0} label={summary.health_label ?? 'N/A'} color={color} />
        </div>
        <div className="card lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Detected Subscriptions</h2>
            {subscriptions.length > 0 && <span className="badge-gray">{subscriptions.length}</span>}
          </div>
          <SubsTable subscriptions={subscriptions} onNegotiate={onNegotiate} />
        </div>
      </div>
    </div>
  );
}
