import { useState } from 'react';
import { Target, Plus, Trash2, Play, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../api/client';
import { fmt } from './shared';

function GoalCard({ goal, result, currency, onDelete }) {
  const hasResult  = !!result;
  const delayInf   = result && result.delay_months >= 9999;
  const delayMonths = result ? result.delay_months : 0;

  return (
    <div className="card animate-fade-in">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white text-[13px]">{goal.name}</p>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Target <span className="text-zinc-600 dark:text-zinc-300">{fmt(goal.goal_amount, currency)}</span>
              {' · '}saving <span className="text-zinc-600 dark:text-zinc-300">{fmt(goal.monthly_savings, currency)}/mo</span>
            </p>
          </div>
        </div>
        <button onClick={() => onDelete(goal.id)}
          className="p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Simulation results */}
      {hasResult && (
        <div className="border border-zinc-100 dark:border-white/[0.06] rounded-xl overflow-hidden">

          {/* Timeline row */}
          <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-white/[0.06]">
            {/* Without subs */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Without subscriptions</p>
              <p className="text-[15px] font-semibold font-mono text-zinc-900 dark:text-white tabular-nums">{result.original_date}</p>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{result.original_months} months</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center bg-zinc-50 dark:bg-white/[0.02] px-2">
              <div className="flex flex-col items-center gap-0.5">
                <ArrowRight className="w-3.5 h-3.5 text-zinc-300" />
                <span className="text-[9px] text-zinc-400 font-mono whitespace-nowrap">subs cost</span>
                <span className="text-[10px] font-semibold font-mono text-amber-600">{fmt(result.total_sub, currency)}/mo</span>
              </div>
            </div>

            {/* With subs */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">With subscriptions</p>
              <p className={`text-[15px] font-semibold font-mono tabular-nums ${delayInf ? 'text-red-600' : 'text-zinc-900 dark:text-white'}`}>
                {delayInf ? 'Unreachable' : result.adjusted_date}
              </p>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {delayInf ? '∞ months' : `${result.adjusted_months} months`}
              </p>
            </div>
          </div>

          {/* Impact footer */}
          <div className={`px-4 py-2.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center gap-2 ${
            delayInf
              ? 'bg-red-50 dark:bg-red-950/10'
              : delayMonths > 0
                ? 'bg-amber-50 dark:bg-amber-950/10'
                : 'bg-emerald-50 dark:bg-emerald-950/10'
          }`}>
            <span className={`text-[11px] font-semibold font-mono ${
              delayInf ? 'text-red-600' : delayMonths > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {delayInf
                ? 'Subscriptions exceed your monthly savings — goal cannot be reached'
                : delayMonths === 0
                  ? 'No impact — subscriptions don\'t affect this goal'
                  : `Subscriptions delay this goal by ${delayMonths} month${delayMonths !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      )}

      {/* No result yet */}
      {!hasResult && (
        <p className="text-[11px] text-zinc-400 bg-zinc-50 dark:bg-white/[0.03] rounded-lg px-3 py-2.5 border border-zinc-100 dark:border-white/[0.05]">
          Run <strong className="text-zinc-600 dark:text-zinc-300">Simulate All</strong> to see how your subscriptions delay reaching this goal.
        </p>
      )}
    </div>
  );
}

export default function GoalsPanel({ goals, onGoalsChange, activeFileId, currency }) {
  const [form, setForm]       = useState({ name: '', goal_amount: '', monthly_savings: '' });
  const [simResults, setSim]  = useState({});
  const [simulating, setSiming] = useState(false);
  const [adding, setAdding]   = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.goal_amount || !form.monthly_savings) return;
    setAdding(true);
    try {
      await api.createGoal({ name: form.name, goal_amount: +form.goal_amount, monthly_savings: +form.monthly_savings });
      toast.success('Goal added!');
      setForm({ name: '', goal_amount: '', monthly_savings: '' });
      setShowForm(false);
      onGoalsChange();
    } catch { toast.error('Failed to add goal'); }
    finally { setAdding(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteGoal(id);
      toast.success('Goal removed');
      onGoalsChange();
    } catch { toast.error('Failed to delete'); }
  };

  const handleSimulateAll = async () => {
    setSiming(true);
    try {
      const res = await api.simulateAllGoals(activeFileId);
      const map = {};
      res.data.forEach(r => { map[r.id] = r; });
      setSim(map);
      toast.success('Simulation complete!');
    } catch { toast.error('Simulation failed'); }
    finally { setSiming(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white text-[14px]">Financial Goals</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">{goals.length} goal{goals.length !== 1 ? 's' : ''} · Simulate to see subscription impact</p>
        </div>
        <div className="flex gap-2">
          {goals.length > 0 && (
            <button onClick={handleSimulateAll} disabled={simulating} className="btn-secondary text-[12px] py-1.5">
              {simulating
                ? <span className="w-3 h-3 border border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
                : <Play className="w-3 h-3" />}
              Simulate All
            </button>
          )}
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-[12px] py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Goal
          </button>
        </div>
      </div>

      {/* What does simulate mean? */}
      {goals.length > 0 && Object.keys(simResults).length === 0 && activeFileId && (
        <div className="flex items-start gap-2.5 bg-brand-50 dark:bg-brand-950/15 border border-brand-100 dark:border-brand-900/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-brand-700 dark:text-brand-300 leading-relaxed">
            <strong>How simulation works:</strong> It calculates how long it takes to reach each goal assuming your monthly savings go toward it — then recalculates after deducting your subscription costs from those savings.
          </p>
        </div>
      )}

      {/* No file selected warning */}
      {!activeFileId && goals.length > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-3">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Select a file in the <strong>Files</strong> tab to simulate subscription impact on your goals.
          </p>
        </div>
      )}

      {/* Add goal form */}
      {showForm && (
        <form onSubmit={handleAdd} className="card border border-brand-100 dark:border-brand-900/30 bg-brand-50/30 dark:bg-brand-950/10 animate-slide-up">
          <h4 className="text-[12px] font-semibold text-zinc-700 dark:text-zinc-300 mb-4">New Goal</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="section-label block mb-1.5">Goal Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="input-field" placeholder="Emergency Fund" required />
            </div>
            <div>
              <label className="section-label block mb-1.5">Target Amount ({currency})</label>
              <input type="number" value={form.goal_amount}
                onChange={e => setForm({...form, goal_amount: e.target.value})}
                className="input-field" placeholder="10000" required min="1" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Monthly Savings ({currency})</label>
              <input type="number" value={form.monthly_savings}
                onChange={e => setForm({...form, monthly_savings: e.target.value})}
                className="input-field" placeholder="500" required min="1" />
            </div>
          </div>
          <p className="text-[10px] text-zinc-400 mt-3 mb-4">
            Monthly savings is how much you currently set aside toward this goal each month.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={adding} className="btn-primary text-[12px] py-1.5">
              {adding ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save Goal
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-[12px] py-1.5">Cancel</button>
          </div>
        </form>
      )}

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="text-center py-14 text-zinc-400">
          <div className="w-12 h-12 bg-zinc-100 dark:bg-white/[0.05] rounded-xl mx-auto flex items-center justify-center mb-4">
            <Target className="w-5 h-5 opacity-40" />
          </div>
          <p className="font-medium text-[13px] text-zinc-600 dark:text-zinc-400">No goals yet</p>
          <p className="text-[11px] mt-1 mb-5 max-w-xs mx-auto leading-relaxed">
            Add a savings goal (like an emergency fund or vacation) and simulate how much your subscriptions are slowing you down.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary text-[12px] py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map(g => (
            <GoalCard key={g.id} goal={g} result={simResults[g.id]} currency={currency} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
