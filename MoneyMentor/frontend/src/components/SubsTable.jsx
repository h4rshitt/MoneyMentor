import { CreditCard, Sparkles } from 'lucide-react';
import { fmt } from './shared';

export default function SubsTable({ subscriptions, currency, onNegotiate }) {
  if (!subscriptions.length) return (
    <div className="text-center py-10 text-gray-400 dark:text-slate-500">
      <div className="w-12 h-12 bg-gray-100 dark:bg-surface-700 rounded-2xl mx-auto flex items-center justify-center mb-3">
        <CreditCard className="w-5 h-5 opacity-40" />
      </div>
      <p className="font-medium text-sm">No subscriptions detected</p>
      <p className="text-xs mt-1 opacity-70">Upload a CSV to start detecting</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-white/[0.05]">
            {['Service', 'Monthly', 'Frequency', 'Next Bill', ''].map(h => (
              <th key={h} className="py-3 px-2 text-left text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
          {subscriptions.map((s, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-surface-700/40 transition-colors group">
              <td className="py-3.5 px-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl leading-none">{s.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-[13px]">{s.name}</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500">{s.occurrence_count} payments</p>
                  </div>
                </div>
              </td>
              <td className="py-3.5 px-2 font-bold text-gray-900 dark:text-white tabular-nums">{fmt(s.monthly_cost, currency)}</td>
              <td className="py-3.5 px-2">
                <span className="badge-blue">{s.frequency}</span>
              </td>
              <td className="py-3.5 px-2 text-gray-400 dark:text-slate-500 text-xs font-mono tabular-nums">{s.next_payment}</td>
              <td className="py-3.5 px-2">
                <button
                  onClick={() => onNegotiate(s)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Sparkles className="w-3 h-3" /> Negotiate
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
