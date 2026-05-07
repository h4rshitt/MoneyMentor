import { useState, useEffect } from 'react';
import { Sparkles, Copy, CheckCheck, X, Key, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import * as api from '../api/client';

export default function BillNegotiator({ prefill = null, isModal = false, onClose = null }) {
  const [form, setForm] = useState({
    service_name: prefill?.name || '',
    current_price: prefill?.monthly_cost || '',
    competitor_price: '',
    api_key: localStorage.getItem('mm_ai_key') || '',
  });
  const [script, setScript] = useState('');
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [serverAI, setServerAI] = useState(null);

  useEffect(() => {
    api.getAIStatus()
      .then(res => { if (res.data.configured) setServerAI(res.data); })
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!form.service_name || !form.current_price || !form.competitor_price) {
      toast.error('Fill in all fields first'); return;
    }
    setLoading(true);
    try {
      if (form.api_key) localStorage.setItem('mm_ai_key', form.api_key);
      const res = await api.generateNegotiationScript({
        service_name: form.service_name,
        current_price: parseFloat(form.current_price),
        competitor_price: parseFloat(form.competitor_price),
        api_key: form.api_key,
      });
      setScript(res.data.script);
      setSource(res.data.source);
      if (res.data.note) toast(res.data.note, { icon: 'ℹ️', duration: 6000 });
    } catch { toast.error('Failed to generate script'); }
    finally { setLoading(false); }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    toast.success('Script copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const localKey = form.api_key;
  const isGroq   = localKey.startsWith('gsk_') || (!localKey && serverAI?.provider === 'groq');
  const isGemini = localKey.startsWith('AIza') || (!localKey && serverAI?.provider === 'gemini');
  const hasAny   = localKey || serverAI?.configured;

  const inner = (
    <div className={isModal ? '' : 'space-y-5'}>
      {/* Modal header */}
      {isModal && (
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-white/[0.05]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-brand-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Bill Negotiator</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500">AI-powered negotiation script</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-surface-700 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-gray-400 hover:text-rose-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={isModal ? 'p-6 space-y-4' : 'space-y-4'}>
        {/* AI Status banners */}
        {!hasAny && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3.5">
            <Key className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              No AI key — using template script. Paste a{' '}
              <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer"
                className="underline font-semibold">free Groq key</a>
              {' '}(gsk_...) for AI scripts. No billing needed.
            </p>
          </div>
        )}
        {isGroq && (
          <div className="flex items-center gap-2.5 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 rounded-xl px-3.5 py-2.5">
            <Zap className="w-3.5 h-3.5 text-brand-500" />
            <p className="text-xs text-brand-700 dark:text-brand-300 font-semibold">
              Groq AI active — Llama 3.3-70b
              {serverAI?.provider === 'groq' && !localKey && <span className="ml-1 opacity-60 font-normal">(server key)</span>}
            </p>
          </div>
        )}
        {isGemini && (
          <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-3.5 py-2.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
              Gemini AI active — gemini-2.0-flash
              {serverAI?.provider === 'gemini' && !localKey && <span className="ml-1 opacity-60 font-normal">(server key)</span>}
            </p>
          </div>
        )}

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="section-label block mb-1.5">Service Name</label>
            <input
              value={form.service_name}
              onChange={e => setForm({...form, service_name: e.target.value})}
              className="input-field"
              placeholder="Netflix, Comcast, AT&T..."
            />
          </div>
          <div>
            <label className="section-label block mb-1.5">Your Price / mo</label>
            <input
              type="number"
              value={form.current_price}
              onChange={e => setForm({...form, current_price: e.target.value})}
              className="input-field tabular-nums"
              placeholder="85"
            />
          </div>
          <div>
            <label className="section-label block mb-1.5">Competitor Price / mo</label>
            <input
              type="number"
              value={form.competitor_price}
              onChange={e => setForm({...form, competitor_price: e.target.value})}
              className="input-field tabular-nums"
              placeholder="60"
            />
          </div>
          <div className="col-span-2">
            <label className="section-label block mb-1.5">
              AI API Key <span className="normal-case font-normal tracking-normal text-gray-400">(optional — Groq gsk_... or Gemini AIza...)</span>
            </label>
            <input
              type="password"
              value={form.api_key}
              onChange={e => setForm({...form, api_key: e.target.value})}
              className="input-field"
              placeholder={serverAI?.configured ? `${serverAI.provider} key configured on server ✓` : 'gsk_... or AIza...'}
            />
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full py-3 text-sm">
          {loading
            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Sparkles className="w-4 h-4" />}
          {loading ? 'Generating...' : 'Generate Script'}
        </button>

        {script && (
          <div className="animate-slide-up space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Generated Script</span>
                {source === 'groq'   && <span className="badge-violet">⚡ Groq AI</span>}
                {source === 'gemini' && <span className="badge-green">✨ Gemini AI</span>}
              </div>
              <button onClick={copyScript}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
                {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-surface-700 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed border border-gray-100 dark:border-white/[0.05] whitespace-pre-wrap">
              {script}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isModal) return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="bg-white dark:bg-surface-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-white/[0.06]">
        {inner}
      </div>
    </div>
  );

  return inner;
}
