import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Key, 
  LogIn, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  UserCheck,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { AdminUser, AdminRole } from '../../types.ts';

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: AdminUser) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Log masuk gagal. Sila semak e-mel dan kata laluan anda.');
        return;
      }

      // Save in session storage
      sessionStorage.setItem('kpmbp_admin_token', data.token);
      sessionStorage.setItem('kpmbp_admin_user', JSON.stringify(data.user));

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError('Ralat sambungan pelayan. Sila cuba sebentar lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Sila lengkapkan e-mel dan kata laluan.');
      return;
    }
    performLogin(email.trim(), password.trim());
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    performLogin(quickEmail, quickPass);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>KPMBP Administrative Security (SES 4.4)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Log Masuk Pusat Kawalan Pentadbir
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Akses berperingkat Role-Based Access Control (RBAC) bagi Super Admin, Pegawai HEP, dan Panel Penilai Bakat.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-start space-x-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Ralat Pengesahan</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                E-mel Rasmi Pentadbir KPMBP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="admin-login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.bakat@kpmbp.edu.my"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 block mb-1.5">
                Kata Laluan / Passkey
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="admin-login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-admin-login-submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Mengesahkan...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Log Masuk Pentadbir</span>
                </>
              )}
            </button>
          </form>

          {/* Quick-Access 1-Click Role Profiles for Evaluation */}
          <div className="border-t border-slate-800 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Akses Pantas Peranan (1-Click Switch):
              </span>
              <span className="text-[10px] text-slate-500 font-mono">SES 4.4 RBAC</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              
              {/* Role 1: SUPER_ADMIN */}
              <button
                type="button"
                id="btn-quick-login-superadmin"
                onClick={() => handleQuickLogin('admin.bakat@kpmbp.edu.my', 'kpmbp2026!')}
                className="bg-slate-950 hover:bg-slate-850 border border-purple-500/30 hover:border-purple-500/60 p-3 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span className="text-[11px] font-bold text-purple-300 uppercase">Super Admin</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">admin.bakat@kpmbp.edu.my</p>
                <span className="text-[9px] text-purple-400/80 block mt-1">Akses Penuh + Hapus + Audit</span>
              </button>

              {/* Role 2: ADMIN */}
              <button
                type="button"
                id="btn-quick-login-admin"
                onClick={() => handleQuickLogin('pegawai.hep@kpmbp.edu.my', 'admin2026!')}
                className="bg-slate-950 hover:bg-slate-850 border border-blue-500/30 hover:border-blue-500/60 p-3 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span className="text-[11px] font-bold text-blue-300 uppercase">Pegawai HEP</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">pegawai.hep@kpmbp.edu.my</p>
                <span className="text-[9px] text-blue-400/80 block mt-1">Peluang, Jemputan &amp; Audit</span>
              </button>

              {/* Role 3: REVIEWER */}
              <button
                type="button"
                id="btn-quick-login-reviewer"
                onClick={() => handleQuickLogin('panel.kebudayaan@kpmbp.edu.my', 'reviewer2026!')}
                className="bg-slate-950 hover:bg-slate-850 border border-emerald-500/30 hover:border-emerald-500/60 p-3 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-[11px] font-bold text-emerald-300 uppercase">Panel Penilai</span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">panel.kebudayaan@kpmbp.edu.my</p>
                <span className="text-[9px] text-emerald-400/80 block mt-1">Saringan &amp; Catatan Status</span>
              </button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
