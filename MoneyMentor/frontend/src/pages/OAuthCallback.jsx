import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const name = searchParams.get('name');
    const email = searchParams.get('email');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setErrorMsg(decodeURIComponent(error));
      return;
    }

    if (token && name && email) {
      // Small delay so the success UI is visible briefly
      setTimeout(() => {
        login(token, { name, email });
        toast.success(`Welcome, ${name}! 🎉`);
        navigate('/dashboard', { replace: true });
      }, 800);
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMsg('Missing authentication data. Please try again.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center animate-fade-in">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">MoneyMentor</span>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl w-80">
          {status === 'loading' && (
            <>
              <div className="w-14 h-14 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-5" />
              <p className="text-white font-semibold text-lg">Signing you in...</p>
              <p className="text-slate-400 text-sm mt-2">Verifying your Google account</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-white font-semibold text-lg">Success!</p>
              <p className="text-slate-400 text-sm mt-2">Redirecting to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-white font-semibold text-lg">Authentication Failed</p>
              <p className="text-slate-400 text-sm mt-2 mb-6">{errorMsg}</p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all"
              >
                Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
