import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  Clock, 
  UserCheck, 
  FileText, 
  Layers, 
  AlertCircle, 
  RefreshCw,
  Eye,
  CheckCircle2,
  Trash2,
  Send,
  LogIn
} from 'lucide-react';
import { AuditLog } from '../../types.ts';

interface AdminAuditTrailProps {
  authToken: string;
}

export const AdminAuditTrail: React.FC<AdminAuditTrailProps> = ({ authToken }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Gagal memuatkan rekod jejak audit.');
        return;
      }

      const data: AuditLog[] = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError('Ralat sambungan pelayan ketika memuatkan rekod audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [authToken]);

  const filteredLogs = logs.filter(log => {
    const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || (
      log.actor_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.entity_id.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actor_role.toLowerCase().includes(q)
    );
    return matchAction && matchQuery;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DELETE')) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (action.includes('CREATE') || action.includes('SUBMIT')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (action.includes('UPDATE') || action.includes('STATUS')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (action.includes('INVITATION') || action.includes('SEND')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    if (action.includes('LOGIN')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5" />
                <span>SES 4.4 Immutable Audit Trail</span>
              </span>
              <span className="text-xs text-slate-400">Jejak Transaksi &amp; Perubahan Sistem</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Log Audit &amp; Rekod Integriti KPMBP
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Setiap tindakan pentadbiran, pendaftaran pelajar, penukaran status, dan jemputan direkod secara kekal bagi pematuhan audit.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchAuditLogs}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors self-start md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Muat Semula Log</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pelaku, ID, butiran..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="ALL">Semua Tindakan ({logs.length})</option>
              <option value="ADMIN_LOGIN">Log Masuk Pentadbir</option>
              <option value="CREATE_OPPORTUNITY">Bina Peluang</option>
              <option value="UPDATE_OPPORTUNITY">Kemaskini Peluang</option>
              <option value="DELETE_OPPORTUNITY">Hapus Peluang</option>
              <option value="SUBMIT_APPLICATION">Hantar Permohonan</option>
              <option value="UPDATE_APPLICATION_STATUS">Kemaskini Status Saringan</option>
              <option value="ADD_APPLICATION_NOTE">Tambah Nota Panel</option>
              <option value="DELETE_APPLICATION">Hapus Permohonan</option>
              <option value="SEND_INVITATION">Hantar Jemputan</option>
              <option value="RESPOND_INVITATION">Respons Jemputan</option>
              <option value="DELETE_STUDENT">Hapus Pelajar</option>
            </select>
          </div>

          <div className="text-xs text-slate-400">
            Memaparkan <strong className="text-white">{filteredLogs.length}</strong> transaksi direkodkan
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex items-center space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Masa &amp; Tarikh</th>
                <th className="py-3.5 px-4">Pelaku (Actor)</th>
                <th className="py-3.5 px-4">Tindakan</th>
                <th className="py-3.5 px-4">Entiti / Sasaran</th>
                <th className="py-3.5 px-4">Butiran Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    {loading ? 'Memuatkan log audit...' : 'Tiada rekod log audit sepadan.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      <div className="font-sans font-semibold text-slate-200">
                        {new Date(log.timestamp).toLocaleDateString('ms-MY')}
                      </div>
                      <div>
                        {new Date(log.timestamp).toLocaleTimeString('ms-MY')}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-white font-sans">{log.actor_name}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-300 font-sans">{log.entity_type}</div>
                      <span className="text-[10px] text-blue-400">{log.entity_id}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans text-xs">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
