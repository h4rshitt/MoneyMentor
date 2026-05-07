import { useState, useMemo } from 'react';
import { Download, Search, Wallet, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmt } from './shared';

const CATEGORY_BADGES = {
  'Food & Dining':    'badge-amber',
  'Entertainment':    'badge-violet',
  'Transport':        'badge-blue',
  'Shopping':         'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400 badge',
  'Health & Fitness': 'badge-green',
  'Utilities & Bills':'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 badge',
  'Subscriptions':    'badge-violet',
  'Income':           'badge-green',
  'Other':            'badge-gray',
};

function CategoryBadge({ category }) {
  const cls = CATEGORY_BADGES[category] || 'badge-gray';
  return <span className={cls}>{category || 'Other'}</span>;
}

export default function TransactionPanel({ transactions }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [amountFilter, setAmountFilter] = useState('All');

  const categories = useMemo(() => {
    const cats = [...new Set(transactions.map(t => t.category || 'Other'))].sort();
    return ['All', ...cats];
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'All' || (t.category || 'Other') === categoryFilter;
      const matchAmount =
        amountFilter === 'All' ||
        (amountFilter === 'income' && t.amount > 0) ||
        (amountFilter === 'expense' && t.amount < 0);
      return matchSearch && matchCat && matchAmount;
    });
  }, [transactions, search, categoryFilter, amountFilter]);

  const downloadCSV = () => {
    const rows = [
      ['Date', 'Description', 'Amount', 'Category'],
      ...transactions.map(t => [t.date, `"${t.description}"`, t.amount, t.category || 'Other']),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'transactions.csv';
    a.click();
    toast.success('Transactions exported!');
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
            placeholder="Search transactions..."
          />
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-surface-700 rounded-xl border border-gray-200 dark:border-white/[0.06]">
          <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 dark:bg-surface-700 rounded-xl border border-gray-200 dark:border-white/[0.06]">
          <select
            value={amountFilter}
            onChange={e => setAmountFilter(e.target.value)}
            className="bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
          >
            <option value="All">All types</option>
            <option value="expense">Expenses only</option>
            <option value="income">Income only</option>
          </select>
        </div>

        {transactions.length > 0 && (
          <button onClick={downloadCSV} className="btn-secondary text-sm py-2.5 flex-shrink-0">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-slate-500">
          <div className="w-14 h-14 bg-gray-100 dark:bg-surface-700 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 opacity-40" />
          </div>
          <p className="font-medium text-sm">{transactions.length === 0 ? 'No transactions yet' : 'No matches'}</p>
          <p className="text-xs mt-1 opacity-70">
            {transactions.length === 0 ? 'Upload a CSV or select a file to view transactions' : 'Try different filters'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto rounded-xl border border-gray-100 dark:border-white/[0.05]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-surface-700 z-10">
              <tr>
                {['Date', 'Description', 'Category', 'Amount'].map(h => (
                  <th key={h} className={`py-3 px-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest ${h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03] bg-white dark:bg-surface-800">
              {filtered.map((t, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-surface-700/40 transition-colors">
                  <td className="py-3 px-4 text-gray-400 dark:text-slate-500 whitespace-nowrap font-mono text-xs tabular-nums">{t.date}</td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200 max-w-xs truncate">{t.description}</td>
                  <td className="py-3 px-4"><CategoryBadge category={t.category} /></td>
                  <td className={`py-3 px-4 text-right font-semibold whitespace-nowrap tabular-nums ${t.amount < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {t.amount < 0 ? '−' : '+'}{fmt(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="sticky bottom-0 bg-gray-50 dark:bg-surface-700 px-4 py-2 text-[11px] text-gray-400 border-t border-gray-100 dark:border-white/[0.05] tabular-nums">
            Showing {filtered.length} of {transactions.length} transactions
          </div>
        </div>
      )}
    </div>
  );
}
