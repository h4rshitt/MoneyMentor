export default function SummaryCard({ icon: Icon, label, value, sub, accent = 'brand' }) {
  const accents = {
    brand:   { icon: 'bg-brand-50 dark:bg-brand-950/25 text-brand-600 dark:text-brand-400',   num: 'text-zinc-900 dark:text-white' },
    emerald: { icon: 'bg-emerald-50 dark:bg-emerald-950/25 text-emerald-600 dark:text-emerald-400', num: 'text-zinc-900 dark:text-white' },
    amber:   { icon: 'bg-amber-50 dark:bg-amber-950/25 text-amber-600 dark:text-amber-400',   num: 'text-zinc-900 dark:text-white' },
    rose:    { icon: 'bg-rose-50 dark:bg-rose-950/25 text-rose-600 dark:text-rose-400',       num: 'text-zinc-900 dark:text-white' },
    cyan:    { icon: 'bg-cyan-50 dark:bg-cyan-950/25 text-cyan-600 dark:text-cyan-400',       num: 'text-zinc-900 dark:text-white' },
  };
  const c = accents[accent] || accents.brand;
  return (
    <div className="card flex flex-col gap-1 hover:-translate-y-0.5 transition-transform duration-150">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${c.icon}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className={`text-[22px] font-semibold font-mono tabular-nums tracking-tight ${c.num}`}>{value}</p>
      <p className="text-[12px] font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
      {sub && <p className="text-[10px] text-zinc-400 font-mono">{sub}</p>}
    </div>
  );
}
