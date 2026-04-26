import { useState, useEffect } from 'react';
import { BarChart2, TrendingDown, TrendingUp, Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import * as api from '../api/client';
import { fmt } from './shared';

const CATEGORY_COLORS = {
  'Food & Dining':    '#f59e0b',
  'Entertainment':    '#8b5cf6',
  'Transport':        '#3b82f6',
  'Shopping':         '#ec4899',
  'Health & Fitness': '#10b981',
  'Utilities & Bills':'#06b6d4',
  'Subscriptions':    '#6366f1',
  'Other':            '#94a3b8',
};

const ChartTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-surface-800 border border-gray-100 dark:border-white/[0.06] rounded-xl px-3 py-2 shadow-card text-xs space-y-1">
      {label && <p className="font-bold text-gray-800 dark:text-white mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill || p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{fmt(p.value, currency)}</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportsPanel({ activeFileId, currency }) {
  const [report, setReport] = useState(null);
  const [catReport, setCatReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const [monthly, category] = await Promise.all([
        api.getMonthlyReport(activeFileId),
        api.getCategoryReport(activeFileId),
      ]);
      setReport(monthly.data);
      setCatReport(category.data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadReport(); }, [activeFileId]);

  const downloadCSV = () => {
    if (!report) return;
    const rows = [['Month', 'Spending', 'Income', 'Net', 'Transactions'],
      ...report.months.map(m => [m.month, m.spending, m.income, m.net, m.transactions])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'monthly_report.csv'; a.click();
    toast.success('Report downloaded!');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mr-3" />
      <span className="text-sm">Loading report...</span>
    </div>
  );

  if (!report || report.months.length === 0) return (
    <div className="card text-center py-16 text-gray-400 dark:text-slate-500">
      <div className="w-14 h-14 bg-gray-100 dark:bg-surface-700 rounded-2xl mx-auto flex items-center justify-center mb-4">
        <BarChart2 className="w-6 h-6 opacity-40" />
      </div>
      <p className="font-medium text-sm">No data to report</p>
      <p className="text-xs mt-1 opacity-70">Upload a CSV file to generate your monthly report</p>
    </div>
  );

  const { summary, months } = report;
  const chartData = months.map(m => ({
    name: m.month,
    Spending: m.spending,
    Income: m.income > 0 ? m.income : undefined,
    Net: m.net,
  }));

  const catPieData = (catReport?.categories || [])
    .filter(c => c.category !== 'Income')
    .slice(0, 8)
    .map(c => ({
      name: c.category,
      value: c.amount,
      pct: c.percentage,
      color: CATEGORY_COLORS[c.category] || '#94a3b8',
    }));

  const STAT_CARDS = [
    { label: 'Total Spending',     value: fmt(summary.total_spending, currency),              icon: TrendingDown, gradient: 'bg-rose-gradient' },
    { label: 'Total Income',       value: fmt(summary.total_income, currency),                icon: TrendingUp,   gradient: 'bg-emerald-gradient' },
    { label: 'Net Savings',        value: fmt(Math.abs(summary.net_savings), currency),       icon: summary.net_savings >= 0 ? TrendingUp : TrendingDown, gradient: summary.net_savings >= 0 ? 'bg-brand-gradient' : 'bg-gold-gradient' },
    { label: 'Avg Monthly Spend',  value: fmt(summary.avg_monthly_spend, currency),           icon: BarChart2,    gradient: 'bg-cyan-gradient' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, gradient }) => (
          <div key={label} className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-brand-sm ${gradient}`}>
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-3">
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold tracking-tight tabular-nums">{value}</p>
            <p className="text-xs mt-1 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Monthly Spending vs Income</h3>
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={(p) => <ChartTooltip {...p} currency={currency} />} />
              <Bar dataKey="Spending" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Net" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {catPieData.length > 0 ? (
          <div className="card">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie dataKey="value" data={catPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  label={({ name, pct }) => `${name.split(' ')[0]} ${pct}%`} labelLine={false} fontSize={11}>
                  {catPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={(p) => <ChartTooltip {...p} currency={currency} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card flex items-center justify-center text-gray-400 text-sm">
            Upload categorised transactions to see breakdown
          </div>
        )}
      </div>

      {/* Category breakdown table */}
      {catPieData.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                  {['Category', 'Total Spent', 'Transactions', '% of Spend'].map(h => (
                    <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                {catPieData.map((c, i) => {
                  const row = catReport.categories.find(r => r.category === c.name);
                  return (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-surface-700/40 transition-colors">
                      <td className="py-3 px-3 flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                        <span className="font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-gray-900 dark:text-white tabular-nums">{fmt(c.value, currency)}</td>
                      <td className="py-3 px-3 text-gray-400 dark:text-slate-500 tabular-nums">{row?.count ?? '—'}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 bg-gray-100 dark:bg-surface-600 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, background: c.color }} />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right tabular-nums">{c.pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly table */}
      <div className="card">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Month-by-Month Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                {['Month', 'Spending', 'Income', 'Net', 'Transactions'].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
              {months.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-surface-700/40 transition-colors">
                  <td className="py-3 px-3 font-medium text-gray-800 dark:text-gray-200">{m.month}</td>
                  <td className="py-3 px-3 text-rose-500 font-semibold tabular-nums">{fmt(m.spending, currency)}</td>
                  <td className="py-3 px-3 text-emerald-500 font-semibold tabular-nums">{m.income > 0 ? fmt(m.income, currency) : '—'}</td>
                  <td className={`py-3 px-3 font-semibold tabular-nums ${m.net >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-amber-500'}`}>{fmt(Math.abs(m.net), currency)}</td>
                  <td className="py-3 px-3 text-gray-400 dark:text-slate-500 tabular-nums">{m.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
