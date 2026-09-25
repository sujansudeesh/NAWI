import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/common/Logo';
import { ShieldCheck, FileCheck, Award, Lock, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';
import { AuthDebugPanel } from '../components/auth/AuthDebugPanel';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [labId, setLabId] = useState('NML-DELHI-001');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear obsolete legacy mock keys on mount
  useEffect(() => {
    localStorage.removeItem('nawi_auth_state');
    localStorage.removeItem('nawi_demo_role');
    localStorage.removeItem('nawi_current_user');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isSignUpMode) {
        const result = await authService.signUp(email, password, fullName);
        if (result.session) {
          navigate('/dashboard', { replace: true });
        } else {
          setSuccessMessage('Registration submitted! If Supabase email verification is enabled, check your email inbox to confirm before signing in.');
        }
      } else {
        const result = await authService.signIn(email, password);

        if (!result || !result.user || !result.session) {
          throw new Error('Authentication failed');
        }

        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrorMessage(err.message || (isSignUpMode ? 'Registration failed.' : 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutExisting = async () => {
    await authService.signOut();
    setErrorMessage('Previous session cleared. Please enter credentials.');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-slate-950">
      {/* Left Trust & Brand Hero Panel */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-r border-slate-800/80 relative overflow-hidden">
        {/* Subtle background scale grid line effect */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <Logo variant="dark" showSubtitle={true} showSIHBadge={true} />
          {/* Temporary Live Auth Debug Panel */}
          <AuthDebugPanel />
        </div>

        <div className="relative z-10 my-12 max-w-lg space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> Legal Metrology Laboratory Platform
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Type evaluation & OIML R-76 test automation.
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Digital type-evaluation and compliance reporting for Non-Automatic Weighing Instruments (NAWI) strictly per OIML Recommendation R-76.
            </p>
          </div>

          {/* 3 Trust Indicators */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-xs">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200">Standardized Test Workflows</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Preset OIML R-76 test modules: Weighing performance, repeatability, eccentricity, zero-setting & tare.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-xs">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200">Compliance-Ready Records</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automated MPE tolerance verification, Supabase database persistence & audit trails.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-xs">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-200">Traceable Digital Reports</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Instant generation of OIML R 76 Test Evaluation Reports with digital officer sign-offs.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Smart India Hackathon 2026 • Problem SIH26035</span>
          <span>Version 1.0.0</span>
        </div>
      </div>

      {/* Right Login Card Panel */}
      <div className="w-full md:w-1/2 p-8 md:p-16 flex items-center justify-center bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => { setIsSignUpMode(false); setErrorMessage(null); setSuccessMessage(null); }}
              className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                !isSignUpMode ? 'border-teal-500 text-teal-400 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUpMode(true); setErrorMessage(null); setSuccessMessage(null); }}
              className={`pb-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                isSignUpMode ? 'border-teal-500 text-teal-400 font-extrabold' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register / Sign Up
            </button>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isSignUpMode ? 'Register Laboratory Account' : 'Laboratory Portal Sign In'}
            </h2>
            <p className="text-xs text-slate-400">
              {isSignUpMode
                ? 'Create a new laboratory officer profile to access NAWI type evaluations.'
                : 'Enter your official laboratory credentials to access active evaluations.'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUpMode && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Officer Full Name *
                </label>
                <input
                  type="text"
                  required={isSignUpMode}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Ananya Rao"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Laboratory / Organization ID
              </label>
              <input
                type="text"
                required
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                placeholder="e.g. NML-DELHI-001"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Officer Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@metrology.gov.in"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Password *</label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-teal-600 focus:ring-0"
                />
                Remember this station
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-950/40 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{isSignUpMode ? 'Registering Officer...' : 'Authenticating Officer...'}</span>
              ) : (
                <>
                  <span>{isSignUpMode ? 'Complete Registration & Sign Up' : 'Sign In to Laboratory System'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Real Supabase Authentication Status Notice */}
          {isSupabaseConfigured() && (
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="flex items-center justify-between font-semibold text-teal-400">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Real Supabase Authentication Active
                </span>
                <button
                  type="button"
                  onClick={handleSignOutExisting}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                >
                  Clear Cached Session
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                All demo/mock role login buttons are disabled. Enter your registered Supabase user email and password above to authenticate.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Access restricted to authorized laboratory personnel.
          </p>
        </div>
      </div>
    </div>
  );
};
