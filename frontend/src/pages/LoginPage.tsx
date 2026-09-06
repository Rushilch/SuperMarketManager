import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { SplitText } from '../components/SplitText';
import { Button } from '../components/ui/Button';
import {
  LogIn,
  ShieldAlert,
  CheckCircle2,
  Database,
  ShieldCheck,
  Zap,
  Boxes,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-3 sm:p-6 lg:p-8 transition-colors duration-200">
      <div className="w-full max-w-5xl rounded-2xl sm:rounded-3xl border-3 sm:border-4 border-black bg-neo-card shadow-neo sm:shadow-neo-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 text-neo-text">
        {/* Left Hero Section with ReactBits SplitText */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-12 bg-neo-yellow dark:bg-neo-surface border-b-3 lg:border-b-0 lg:border-r-3 border-black flex flex-col justify-between relative overflow-hidden">
          {/* Subtle brutalist grid pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1.5px,transparent_1.5px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-black text-white font-mono font-bold text-xs uppercase tracking-wider shadow-neo-sm">
              <Boxes className="h-4 w-4 text-neo-yellow" />
              <span>Next-Gen ERP</span>
            </div>

            {/* REACTBITS SPLITTEXT COMPONENT: ProductHub */}
            <div className="py-1 sm:py-2">
              <SplitText
                text="ProductHub"
                delay={40}
                animationFrom={{ opacity: 0, transform: 'translate3d(0, 35px, 0)' }}
                animationTo={{ opacity: 1, transform: 'translate3d(0, 0, 0)' }}
                easing="cubic-bezier(0.2, 0.65, 0.3, 0.9)"
                className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-black dark:text-neo-yellow leading-tight"
              />
              <p className="mt-2 sm:mt-4 text-xs sm:text-sm lg:text-base font-bold text-black dark:text-neo-text leading-snug">
                Raw industrial precision for inventory tracking & transactional orders.
              </p>
            </div>

            <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
              <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white dark:bg-neo-card border-2 border-black rounded-xl shadow-neo-sm font-bold text-xs">
                <div className="p-1 sm:p-1.5 bg-neo-cyan text-black rounded-lg border border-black shrink-0">
                  <Database className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span className="truncate sm:whitespace-normal">ACID Atomic Orders via Prisma $transaction</span>
              </div>
              <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white dark:bg-neo-card border-2 border-black rounded-xl shadow-neo-sm font-bold text-xs">
                <div className="p-1 sm:p-1.5 bg-neo-lime text-black rounded-lg border border-black shrink-0">
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <span className="truncate sm:whitespace-normal">Sub-second Low-Stock Reorder Triggers</span>
              </div>
              <div className="hidden sm:flex items-center gap-3 p-3 bg-white dark:bg-neo-card border-2 border-black rounded-xl shadow-neo-sm font-bold text-xs">
                <div className="p-1.5 bg-neo-pink text-white rounded-lg border border-black shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Role-Based Access & Reversible Stock Audits</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t-2 border-black font-mono text-[10px] sm:text-xs font-bold text-black/70 dark:text-white/70">
            NEOBRUTALISM ARCHITECTURE • STAGGERED REVEAL
          </div>
        </div>

        {/* Right Sign-in Form */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-12 flex flex-col justify-between bg-neo-card">
          <div className="flex items-center justify-between pb-4 sm:pb-6 border-b-2 sm:border-b-0 border-black/10">
            <span className="font-mono font-black text-xs sm:text-sm uppercase tracking-widest text-neo-muted">
              AUTHENTICATION
            </span>
            <ThemeToggle showLabel />
          </div>

          <div className="max-w-md w-full mx-auto space-y-5 sm:space-y-6 pt-4 sm:pt-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
                Sign In
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-neo-muted font-medium">
                Enter your credentials to control inventory and manage dispatch.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 sm:gap-3 rounded-xl bg-neo-pink p-3 sm:p-3.5 text-xs text-white font-bold border-2 border-black shadow-neo-sm animate-shake">
                <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-neo-text placeholder-neo-muted font-bold shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10 transition-colors"
                  placeholder="name@company.com"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-neo-text placeholder-neo-muted font-bold shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10 transition-colors"
                  placeholder="••••••••••••"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                icon={<LogIn className="h-4 w-4 sm:h-5 sm:w-5" />}
                className="w-full py-3 sm:py-3.5 mt-2"
              >
                Enter ProductHub
              </Button>
            </form>

            {/* Quick Demo Autofill Pills */}
            <div className="rounded-2xl border-2 border-black bg-neo-bg p-3.5 sm:p-4 shadow-neo-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neo-text">
                  Instant Demo Access
                </span>
                <span className="text-[10px] font-mono text-neo-muted font-bold">1-Click AutoFill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@inventory.com', 'AdminPassword123!')}
                  className="rounded-xl bg-neo-yellow text-black p-2.5 text-left border-2 border-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between font-black text-xs uppercase">
                    <span>Admin</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[11px] font-medium mt-0.5 truncate opacity-90">Full Control</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('staff@inventory.com', 'StaffPassword123!')}
                  className="rounded-xl bg-neo-cyan text-black p-2.5 text-left border-2 border-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between font-black text-xs uppercase">
                    <span>Staff</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[11px] font-medium mt-0.5 truncate opacity-90">Orders & Stock</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('cashier@inventory.com', 'CashierPassword123!')}
                  className="rounded-xl bg-neo-lime text-black p-2.5 text-left border-2 border-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between font-black text-xs uppercase">
                    <span>Cashier</span>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-[11px] font-medium mt-0.5 truncate opacity-90">POS & Barcode</p>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center pt-5 sm:pt-6 text-[10px] sm:text-xs font-mono font-bold text-neo-muted">
            PRODUCTHUB &copy; {new Date().getFullYear()} — NEOBRUTALIST ERP
          </div>
        </div>
      </div>
    </div>
  );
};