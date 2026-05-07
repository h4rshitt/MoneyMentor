import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, CreditCard, Moon, Sun, LogOut,
  RefreshCw, FolderOpen, Wallet, PieChart, BarChart2,
  Target, Sparkles, Menu, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../api/client';
import { fmt } from '../components/shared';
import FileManager        from '../components/FileManager';
import GoalsPanel         from '../components/GoalsPanel';
import ReportsPanel       from '../components/ReportsPanel';
import BillNegotiator     from '../components/BillNegotiator';
import TransactionPanel   from '../components/TransactionPanel';
import OverviewPanel      from '../components/OverviewPanel';
import SubscriptionsPanel from '../components/SubscriptionsPanel';

const NAV = [
  { id: 'overview',      label: 'Overview',       icon: PieChart,   section: 'main' },
  { id: 'files',         label: 'Files',           icon: FolderOpen, section: 'main' },
  { id: 'transactions',  label: 'Transactions',    icon: Wallet,     section: 'main' },
  { id: 'subscriptions', label: 'Subscriptions',   icon: CreditCard, section: 'main' },
  { id: 'goals',         label: 'Goals',           icon: Target,     section: 'tools' },
  { id: 'reports',       label: 'Reports',         icon: BarChart2,  section: 'tools' },
  { id: 'negotiate',     label: 'Bill Negotiator', icon: Sparkles,   section: 'tools' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode]   = useState(() => localStorage.getItem('mm_dark') === 'true');
  const [tab, setTab]             = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [files, setFiles]               = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [summary, setSummary]           = useState({ total_monthly_cost: 0, annual_cost: 0, subscription_count: 0 });
  const [goals, setGoals]               = useState([]);
  const [categoryData, setCategoryData] = useState(null);
  const [negotiateTarget, setNegotiateTarget] = useState(null);
  const [loading, setLoading]           = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('mm_dark', darkMode);
  }, [darkMode]);

  const loadAll = async (fileId) => {
    setLoading(true);
    try {
      const [filesRes, txRes, subsRes, sumRes, goalsRes, catRes] = await Promise.all([
        api.listFiles(),
        api.getTransactions(fileId),
        api.detectSubscriptions(fileId),
        api.getSubscriptionSummary(fileId),
        api.listGoals(),
        api.getCategoryReport(fileId),
      ]);
      setFiles(filesRes.data);
      setTransactions(txRes.data);
      setSubscriptions(subsRes.data);
      setSummary(sumRes.data);
      setGoals(goalsRes.data);
      setCategoryData(catRes.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(activeFileId); }, [activeFileId]);

  const handleFileRefresh = (latestFileId) => {
    setActiveFileId(latestFileId || activeFileId);
    loadAll(latestFileId || activeFileId);
  };

  const handleLogout = () => {
    logout(); navigate('/login');
    toast('Logged out. See you soon!');
  };

  const activeFileName = files.find(f => f.id === activeFileId)?.filename;
  const mainNav  = NAV.filter(n => n.section === 'main');
  const toolsNav = NAV.filter(n => n.section === 'tools');

  const NavButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => { setTab(id); setSidebarOpen(false); }}
      className={`nav-item ${tab === id ? 'nav-item-active' : ''}`}
    >
      <Icon className="w-[15px] h-[15px] flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] flex">

      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 flex flex-col
        bg-white dark:bg-[#111113]
        border-r border-zinc-200 dark:border-white/[0.06]
        transform transition-transform duration-200
        lg:translate-x-0 lg:static lg:inset-auto
        ${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'}
      `}>

        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-zinc-100 dark:border-white/[0.05]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-[14px] text-zinc-900 dark:text-white tracking-tight">MoneyMentor</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden btn-ghost p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>

          {activeFileName && (
            <div className="mt-3 flex items-center gap-2 px-2.5 py-1.5 bg-zinc-50 dark:bg-white/[0.04] rounded-lg border border-zinc-200 dark:border-white/[0.06]">
              <FolderOpen className="w-3 h-3 text-zinc-400 flex-shrink-0" />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">{activeFileName}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="section-label px-2.5 mb-2">Workspace</p>
          {mainNav.map(n => <NavButton key={n.id} {...n} />)}

          <div className="h-px bg-zinc-100 dark:bg-white/[0.05] my-3 mx-1" />
          <p className="section-label px-2.5 mb-2">Tools</p>
          {toolsNav.map(n => <NavButton key={n.id} {...n} />)}
        </nav>

        {/* User footer */}
        <div className="px-2 py-3 border-t border-zinc-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors">
            <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center text-white font-semibold text-[10px] flex-shrink-0">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-900 dark:text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-zinc-400 truncate font-mono">{user?.email}</p>
            </div>
            <button onClick={handleLogout}
              className="text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-colors p-0.5"
              title="Logout">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-white/90 dark:bg-[#111113]/90 backdrop-blur-xl border-b border-zinc-200 dark:border-white/[0.06] px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden btn-ghost p-2">
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[14px] font-semibold text-zinc-900 dark:text-white tracking-tight">
                {NAV.find(n => n.id === tab)?.label}
              </h1>
              <p className="text-[11px] text-zinc-400 font-mono">
                {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => loadAll(activeFileId)} className="btn-ghost p-2" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-500' : ''}`} />
            </button>

            <button onClick={() => setDarkMode(!darkMode)} className="btn-ghost p-2">
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">

          {tab === 'overview' && (
            <OverviewPanel
              summary={summary}
              subscriptions={subscriptions}
                            activeFileId={activeFileId}
              categoryData={categoryData}
              onNavigate={setTab}
              onNegotiate={setNegotiateTarget}
            />
          )}

          {tab === 'files' && (
            <div className="card animate-fade-in max-w-2xl">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-zinc-100 dark:bg-white/[0.06] rounded-lg flex items-center justify-center">
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">File Manager</h2>
                  <p className="text-[11px] text-zinc-400">Upload your bank statement CSV to analyse</p>
                </div>
              </div>
              <FileManager files={files} activeFileId={activeFileId} onFileSelect={setActiveFileId} onRefresh={handleFileRefresh} />
            </div>
          )}

          {tab === 'transactions' && (
            <div className="card animate-fade-in">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-zinc-100 dark:bg-white/[0.06] rounded-lg flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div>
                  <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    Transactions
                    {transactions.length > 0 && (
                      <span className="badge-gray">{transactions.length}</span>
                    )}
                  </h2>
                  <p className="text-[11px] text-zinc-400">All transactions from your uploaded file</p>
                </div>
              </div>
              <TransactionPanel transactions={transactions} />
            </div>
          )}

          {tab === 'subscriptions' && (
            <SubscriptionsPanel
              summary={summary}
              subscriptions={subscriptions}
                            onNegotiate={setNegotiateTarget}
            />
          )}

          {tab === 'goals' && (
            <div className="card animate-fade-in max-w-3xl">
              <GoalsPanel goals={goals} onGoalsChange={async () => { const r = await api.listGoals(); setGoals(r.data); }} activeFileId={activeFileId} />
            </div>
          )}

          {tab === 'reports' && (
            <div className="animate-fade-in">
              <ReportsPanel activeFileId={activeFileId} />
            </div>
          )}

          {tab === 'negotiate' && (
            <div className="max-w-lg animate-fade-in space-y-4">
              <div className="card">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[13px] font-semibold text-zinc-900 dark:text-white">Bill Negotiator</h2>
                    <p className="text-[11px] text-zinc-400">AI-generated script to lower your monthly bills</p>
                  </div>
                </div>
                <BillNegotiator isModal={false} />
              </div>

              {subscriptions.length > 0 && (
                <div className="card">
                  <p className="section-label mb-3">Quick-fill from subscriptions</p>
                  <div className="flex flex-wrap gap-2">
                    {subscriptions.map((s, i) => (
                      <button key={i} onClick={() => setNegotiateTarget(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-white/[0.04] rounded-lg text-[12px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-brand-50 dark:hover:bg-brand-950/20 hover:text-brand-700 dark:hover:text-brand-300 border border-zinc-200 dark:border-white/[0.06] transition-all">
                        <span>{s.icon}</span>
                        <span>{s.name.split(' ')[0]}</span>
                        <span className="text-zinc-400 font-mono text-[11px]">{fmt(s.monthly_cost)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {negotiateTarget && (
        <BillNegotiator
          isModal={true}
          prefill={negotiateTarget}
          onClose={() => setNegotiateTarget(null)}
                  />
      )}
    </div>
  );
}
