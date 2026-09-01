import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  HardDrive,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Info,
  ChevronRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  BackupMetadata,
  RestorePreview,
  DuplicateAuditResult,
  CSVImportPreview,
  CSVImportResult,
  AdminRole,
  AdminUser
} from '../../types.ts';

interface AdminDataSafetyProps {
  authToken: string | null;
  adminUser: AdminUser | null;
  onDataChanged?: () => void;
}

export const AdminDataSafety: React.FC<AdminDataSafetyProps> = ({
  authToken,
  adminUser,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'backup' | 'audit' | 'import'>('export');

  // SIMPAN CSV STATE
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // BACKUP DATA STATE
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [creatingBackup, setCreatingBackup] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  // RESTORE MODAL STATE
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [restorePreview, setRestorePreview] = useState<RestorePreview | null>(null);
  const [restorePreviewLoading, setRestorePreviewLoading] = useState<boolean>(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState<string>('');
  const [restoring, setRestoring] = useState<boolean>(false);

  // AUDIT DUPLIKASI STATE
  const [auditResult, setAuditResult] = useState<DuplicateAuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [selectedAuditFilter, setSelectedAuditFilter] = useState<'ALL' | 'STUDENT' | 'APPLICATION' | 'INVITATION' | 'PARTICIPATION'>('ALL');

  // IMPORT CSV STATE
  const [importEntity, setImportEntity] = useState<'students' | 'studentskills' | 'opportunities'>('students');
  const [importCsvText, setImportCsvText] = useState<string>('');
  const [importStep, setImportStep] = useState<'INPUT' | 'PREVIEW' | 'RESULT'>('INPUT');
  const [importPreviewData, setImportPreviewData] = useState<CSVImportPreview | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'DUPLICATE' | 'INVALID' | 'WARNING'>('ALL');
  const [importing, setImporting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const isSuperAdmin = adminUser?.role === AdminRole.SUPER_ADMIN;

  // Load backups on mount or tab switch
  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackups();
    } else if (activeTab === 'audit' && !auditResult) {
      runDuplicateAudit();
    }
  }, [activeTab]);

  const authHeader = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  // --------------------------------------------------------------------------
  // 1. SIMPAN CSV (CSV EXPORT)
  // --------------------------------------------------------------------------
  const handleExportCSV = async (type: string, label: string) => {
    setExportLoading(type);
    setExportError(null);
    setExportSuccess(null);
    try {
      const res = await fetch(`/api/admin/data-safety/export-csv?type=${type}`, {
        headers: { ...authHeader },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal memuat turun fail CSV.');
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = `KPMBP_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      if (contentDisposition && contentDisposition.includes('filename=')) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Fail CSV ${label} (${filename}) berjaya dimuat turun.`);
    } catch (err: any) {
      setExportError(err.message || 'Ralat mengeksport data CSV.');
    } finally {
      setExportLoading(null);
    }
  };

  // --------------------------------------------------------------------------
  // 2. BACKUP DATA (CREATE & LIST)
  // --------------------------------------------------------------------------
  const fetchBackups = async () => {
    setBackupLoading(true);
    setBackupError(null);
    try {
      const res = await fetch('/api/admin/data-safety/backups', {
        headers: { ...authHeader },
      });
      if (!res.ok) throw new Error('Gagal memuat senarai salinan sandaran.');
      const data = await res.json();
      setBackups(data);
    } catch (err: any) {
      setBackupError(err.message || 'Ralat memuat salinan sandaran.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setBackupMessage(null);
    setBackupError(null);
    try {
      const res = await fetch('/api/admin/data-safety/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencipta salinan sandaran.');
      setBackupMessage(data.message || 'Salinan sandaran baharu berjaya dicipta.');
      fetchBackups();
    } catch (err: any) {
      setBackupError(err.message || 'Ralat mencipta salinan sandaran.');
    } finally {
      setCreatingBackup(false);
    }
  };

  // RESTORE PREVIEW & EXECUTE
  const openRestoreModal = async (backupId: string) => {
    setSelectedBackupForRestore(backupId);
    setRestorePreview(null);
    setRestoreConfirmText('');
    setRestorePreviewLoading(true);
    try {
      const res = await fetch('/api/admin/data-safety/restore-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({ backup_id: backupId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyemak data salinan.');
      setRestorePreview(data);
    } catch (err: any) {
      alert(err.message || 'Ralat menyemak salinan sandaran.');
      setSelectedBackupForRestore(null);
    } finally {
      setRestorePreviewLoading(false);
    }
  };

  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore || restoreConfirmText.trim().toUpperCase() !== 'PULIHKAN DATA') {
      return;
    }
    setRestoring(true);
    try {
      const res = await fetch('/api/admin/data-safety/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({ backup_id: selectedBackupForRestore }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memulihkan data.');
      setBackupMessage(data.message || 'Data berjaya dipulihkan.');
      setSelectedBackupForRestore(null);
      fetchBackups();
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Ralat semasa memulihkan data.');
    } finally {
      setRestoring(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. AUDIT DUPLIKASI
  // --------------------------------------------------------------------------
  const runDuplicateAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch('/api/admin/data-safety/audit-duplicates', {
        headers: { ...authHeader },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menjalankan audit duplikasi.');
      setAuditResult(data);
    } catch (err: any) {
      setAuditError(err.message || 'Ralat menjalankan audit duplikasi.');
    } finally {
      setAuditLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. IMPORT CSV
  // --------------------------------------------------------------------------
  const sampleCSVTemplates: Record<string, string> = {
    students: `student_id_number,full_name,preferred_name,programme,semester,class,gender,phone,email
PDA-2502-012,MUHAMMAD DANISH BIN AZMAN,Danish,Diploma in Computer Science,2,DCS2A,LELAKI,012-3456789,danish.dcs@student.kpmbp.edu.my
PDA-2502-013,NURUL HUDA BINTI ISMAIL,Huda,Diploma in Business Studies,3,DBS3B,PEREMPUAN,013-9876543,huda.dbs@student.kpmbp.edu.my`,
    studentskills: `student_id_number,skill_name,skill_level,experience_duration,is_primary
PDA-2502-012,Keyboard / Piano,ADVANCED,4 tahun,YA
PDA-2502-013,Public Speaking & Pengacaraan,INTERMEDIATE,2 tahun,YA`,
    opportunities: `title,category_name,description,open_call_roles,closing_date
FESTIVAL KESENIAN KPMBP 2026,Music,Festival nyanyian dan persembahan akustik antara kolej.,"Vocal, Acoustic Guitar, Percussion",2026-10-15T23:59:00Z`,
  };

  const handlePreviewCSV = async () => {
    if (!importCsvText.trim()) {
      setImportError('Sila muat naik atau tampal kandungan fail CSV.');
      return;
    }
    setImportError(null);
    setImporting(true);
    try {
      const res = await fetch('/api/admin/data-safety/import-csv/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          entity_type: importEntity,
          csv_content: importCsvText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menganalisis fail CSV.');
      setImportPreviewData(data);
      setImportStep('PREVIEW');
    } catch (err: any) {
      setImportError(err.message || 'Ralat menganalisis CSV.');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportCsvText(content || '');
    };
    reader.readAsText(file);
  };

  const handleCommitImport = async () => {
    if (!importPreviewData) return;
    const validRecords = importPreviewData.rows
      .filter(r => r.status === 'VALID' || r.status === 'WARNING')
      .map(r => r.normalized_data);

    if (validRecords.length === 0) {
      alert('Tiada rekod sah untuk diimport.');
      return;
    }

    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch('/api/admin/data-safety/import-csv/commit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify({
          entity_type: importEntity,
          records: validRecords,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan rekod import.');
      setImportResult(data);
      setImportStep('RESULT');
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setImportError(err.message || 'Ralat melaksanakan import data.');
    } finally {
      setImporting(false);
    }
  };

  // Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6" id="data-safety-centre-container">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              SES 4.4 Data Safety Engine
            </span>
            <span className="text-xs text-slate-500">Pusat Kawalan & Keselamatan Data Rasmi</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Pusat Keselamatan Data Pentadbir</h2>
          <p className="text-sm text-slate-600 mt-1">
            Urus eksport fail CSV, salinan sandaran (backup), audit duplikasi rekod, dan import selamat dengan integriti penuh.
          </p>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            id="tab-simpan-csv"
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Simpan CSV
          </button>
          <button
            id="tab-backup-data"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'backup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Backup Data
          </button>
          <button
            id="tab-audit-duplikasi"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Audit Duplikasi
          </button>
          <button
            id="tab-import-csv"
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SIMPAN CSV (CSV EXPORT) */}
      {/* ========================================================================= */}
      {activeTab === 'export' && (
        <div className="space-y-6" id="section-simpan-csv">
          {exportSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{exportSuccess}</span>
              </div>
              <button onClick={() => setExportSuccess(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">Tutup</button>
            </div>
          )}
          {exportError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{exportError}</span>
              </div>
              <button onClick={() => setExportError(null)} className="text-rose-700 hover:text-rose-900 text-xs font-semibold">Tutup</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card: Pelajar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Senarai Pelajar (Students)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Eksport data profil pelajar berdaftar termasuk ID, Nama Penuh, Program, Semester, Jantina, Telefon, dan E-mel.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Format: .CSV (RFC 4180)</span>
                <button
                  id="btn-export-students"
                  disabled={exportLoading === 'students'}
                  onClick={() => handleExportCSV('students', 'Pelajar')}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  {exportLoading === 'students' ? 'Mengeksport...' : 'Simpan CSV'}
                </button>
              </div>
            </div>

            {/* Card: Kemahiran Pelajar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Kemahiran Pelajar (Talents)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Eksport seluruh rekod bakat pelajar beserta tahap kemahiran (Beginner/Intermediate/Advanced) dan tempoh pengalaman.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Format: .CSV (RFC 4180)</span>
                <button
                  id="btn-export-skills"
                  disabled={exportLoading === 'studentSkills'}
                  onClick={() => handleExportCSV('studentSkills', 'Kemahiran Pelajar')}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  {exportLoading === 'studentSkills' ? 'Mengeksport...' : 'Simpan CSV'}
                </button>
              </div>
            </div>

            {/* Card: Panggilan Terbuka */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Panggilan Terbuka (Opportunities)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Eksport senarai program aktiviti, peranan dibuka, tarikh tutup, status penerimaan, dan jumlah permohonan.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Format: .CSV (RFC 4180)</span>
                <button
                  id="btn-export-opportunities"
                  disabled={exportLoading === 'opportunities'}
                  onClick={() => handleExportCSV('opportunities', 'Panggilan Terbuka')}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  {exportLoading === 'opportunities' ? 'Mengeksport...' : 'Simpan CSV'}
                </button>
              </div>
            </div>

            {/* Card: Permohonan Pelajar */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Permohonan Pelajar (Applications)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Eksport senarai permohonan pelajar merangkumi status semasa, tarikh hantar, dan rekod penilai pentadbir.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Format: .CSV (RFC 4180)</span>
                <button
                  id="btn-export-applications"
                  disabled={exportLoading === 'applications'}
                  onClick={() => handleExportCSV('applications', 'Permohonan')}
                  className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  {exportLoading === 'applications' ? 'Mengeksport...' : 'Simpan CSV'}
                </button>
              </div>
            </div>

            {/* Card: Jemputan Pentadbir */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Jemputan Pentadbir (Invitations)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Eksport jemputan rasmi yang dihantar kepada pelajar serta respons status (Pending / Accepted / Declined).
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Format: .CSV (RFC 4180)</span>
                <button
                  id="btn-export-invitations"
                  disabled={exportLoading === 'invitations'}
                  onClick={() => handleExportCSV('invitations', 'Jemputan')}
                  className="px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  {exportLoading === 'invitations' ? 'Mengeksport...' : 'Simpan CSV'}
                </button>
              </div>
            </div>

            {/* Card: Sejarah Penglibatan */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Sejarah Penglibatan (History)</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Eksport rekod penglibatan dan pencapaian pelajar terdahulu bagi tujuan semakan merit kokurikulum dan pengesahan rasmi.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Format: .CSV (RFC 4180)</span>
                <button
                  id="btn-export-participation"
                  disabled={exportLoading === 'participation'}
                  onClick={() => handleExportCSV('participation', 'Sejarah Penglibatan')}
                  className="px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  {exportLoading === 'participation' ? 'Mengeksport...' : 'Simpan CSV'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BACKUP DATA (BACKUP & SAFE RESTORE) */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6" id="section-backup-data">
          {backupMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{backupMessage}</span>
              </div>
              <button onClick={() => setBackupMessage(null)} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">Tutup</button>
            </div>
          )}
          {backupError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{backupError}</span>
              </div>
              <button onClick={() => setBackupError(null)} className="text-rose-700 hover:text-rose-900 text-xs font-semibold">Tutup</button>
            </div>
          )}

          {/* Action Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Salinan Sandaran Berwibawa</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Salinan sandaran menyimpan keadaan data penuh secara selamat dan berjadual tanpa mengganggu rekod semasa.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="btn-refresh-backups"
                disabled={backupLoading}
                onClick={fetchBackups}
                className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Muat Semula"
              >
                <RefreshCw className={`w-4 h-4 ${backupLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                id="btn-create-backup-now"
                disabled={creatingBackup}
                onClick={handleCreateBackup}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <HardDrive className="w-3.5 h-3.5" />
                {creatingBackup ? 'Mencipta Salinan...' : 'Cipta Salinan Sandaran Baharu'}
              </button>
            </div>
          </div>

          {/* Backups List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm">Senarai Salinan Sandaran ({backups.length})</h4>
              <span className="text-xs text-slate-600">Standard Integriti: SES 4.4</span>
            </div>

            {backupLoading ? (
              <div className="p-8 text-center text-slate-600 text-xs">Memuat senarai salinan sandaran...</div>
            ) : backups.length === 0 ? (
              <div className="p-10 text-center text-slate-600">
                <HardDrive className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">Tiada Salinan Sandaran Ditemui</p>
                <p className="text-xs text-slate-600 mt-1">Klik butang &quot;Cipta Salinan Sandaran Baharu&quot; untuk membuat salinan data pertama anda.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {backups.map(b => (
                  <div key={b.backup_id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{b.filename}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {formatBytes(b.file_size_bytes)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-600 mt-1">
                        <span>Dicipta: {new Date(b.timestamp).toLocaleString('ms-MY')}</span>
                        <span>Oleh: {b.created_by_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-700 font-medium mt-2">
                        <span>Pelajar: <strong>{b.counts.students}</strong></span>
                        <span>•</span>
                        <span>Kemahiran: <strong>{b.counts.studentSkills}</strong></span>
                        <span>•</span>
                        <span>Peluang: <strong>{b.counts.opportunities}</strong></span>
                        <span>•</span>
                        <span>Permohonan: <strong>{b.counts.applications}</strong></span>
                        <span>•</span>
                        <span>Jemputan: <strong>{b.counts.invitations}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      {isSuperAdmin && (
                        <button
                          id={`btn-restore-${b.backup_id}`}
                          onClick={() => openRestoreModal(b.backup_id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Pulihkan Data
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SAFE RESTORE CONFIRMATION MODAL */}
          {selectedBackupForRestore && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Pengesahan Pemulihan Data</h3>
                    <p className="text-xs text-slate-500">Tindakan ini memerlukan kebenaran Super Admin yang eksplisit.</p>
                  </div>
                </div>

                {restorePreviewLoading ? (
                  <div className="py-8 text-center text-xs text-slate-500">Menganalisis integriti salinan sandaran...</div>
                ) : restorePreview ? (
                  <div className="space-y-4">
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                      <p className="font-bold">Amaran Keselamatan (SES 4.4):</p>
                      <p>{restorePreview.warningMessage}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                      <div className="font-bold text-slate-800 mb-2">Perbandingan Rekod Semasa vs Salinan:</div>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>Pelajar Semasa: <strong>{restorePreview.currentCounts.students}</strong></div>
                        <div>Pelajar Salinan: <strong className="text-indigo-600">{restorePreview.backupCounts.students}</strong></div>
                        <div>Peluang Semasa: <strong>{restorePreview.currentCounts.opportunities}</strong></div>
                        <div>Peluang Salinan: <strong className="text-indigo-600">{restorePreview.backupCounts.opportunities}</strong></div>
                        <div>Permohonan Semasa: <strong>{restorePreview.currentCounts.applications}</strong></div>
                        <div>Permohonan Salinan: <strong className="text-indigo-600">{restorePreview.backupCounts.applications}</strong></div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sila taip perkataan <span className="font-mono text-rose-600 font-bold">PULIHKAN DATA</span> untuk meneruskan:
                      </label>
                      <input
                        id="input-restore-confirmation"
                        type="text"
                        value={restoreConfirmText}
                        onChange={(e) => setRestoreConfirmText(e.target.value)}
                        placeholder="PULIHKAN DATA"
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-mono uppercase"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedBackupForRestore(null)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        id="btn-confirm-restore"
                        disabled={restoring || restoreConfirmText.trim().toUpperCase() !== 'PULIHKAN DATA'}
                        onClick={handleExecuteRestore}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${restoring ? 'animate-spin' : ''}`} />
                        {restoring ? 'Memulihkan...' : 'Sahkan & Pulihkan Data'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. AUDIT DUPLIKASI (DUPLICATE AUDIT ENGINE) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-6" id="section-audit-duplikasi">
          {/* Action Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Audit Duplikasi & Integriti Rekod</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Mengimbas kemungkinan pertindihan ID Pelajar, e-mel, permohonan berulang, jemputan, dan rekod penglibatan secara telus.
              </p>
            </div>
            <button
              id="btn-run-duplicate-audit"
              disabled={auditLoading}
              onClick={runDuplicateAudit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditLoading ? 'animate-spin' : ''}`} />
              {auditLoading ? 'Mengimbas Data...' : 'Jalankan Imbasan Duplikasi'}
            </button>
          </div>

          {auditError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{auditError}</span>
            </div>
          )}

          {auditResult && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setSelectedAuditFilter('ALL')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedAuditFilter === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80">Jumlah Pendua</div>
                  <div className="text-2xl font-bold mt-1">{auditResult.total_duplicates_found}</div>
                </button>

                <button
                  onClick={() => setSelectedAuditFilter('STUDENT')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedAuditFilter === 'STUDENT'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80">Pelajar Pendua</div>
                  <div className="text-2xl font-bold mt-1">{auditResult.summary.students}</div>
                </button>

                <button
                  onClick={() => setSelectedAuditFilter('APPLICATION')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedAuditFilter === 'APPLICATION'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80">Permohonan Pendua</div>
                  <div className="text-2xl font-bold mt-1">{auditResult.summary.applications}</div>
                </button>

                <button
                  onClick={() => setSelectedAuditFilter('PARTICIPATION')}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedAuditFilter === 'PARTICIPATION'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-semibold opacity-80">Penglibatan Pendua</div>
                  <div className="text-2xl font-bold mt-1">{auditResult.summary.participation}</div>
                </button>
              </div>

              {/* Duplicates Findings List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Dapatan Audit ({auditResult.duplicates.filter(d => selectedAuditFilter === 'ALL' || d.entity_type === selectedAuditFilter).length})
                  </h4>
                  <span className="text-xs text-slate-600">Imbasan Terakhir: {new Date(auditResult.scanned_at).toLocaleTimeString('ms-MY')}</span>
                </div>

                {auditResult.duplicates.filter(d => selectedAuditFilter === 'ALL' || d.entity_type === selectedAuditFilter).length === 0 ? (
                  <div className="p-10 text-center text-slate-600">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-800">Integriti Data Cemerlang</p>
                    <p className="text-xs text-slate-600 mt-1">Tiada rekod pendua dikesan dalam pangkalan data bagi kategori ini.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {auditResult.duplicates
                      .filter(d => selectedAuditFilter === 'ALL' || d.entity_type === selectedAuditFilter)
                      .map(dup => (
                        <div key={dup.id} className="p-5 hover:bg-slate-50 transition-colors space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                dup.entity_type === 'STUDENT' ? 'bg-blue-100 text-blue-800' :
                                dup.entity_type === 'APPLICATION' ? 'bg-amber-100 text-amber-800' :
                                dup.entity_type === 'INVITATION' ? 'bg-purple-100 text-purple-800' :
                                'bg-teal-100 text-teal-800'
                              }`}>
                                {dup.entity_type}
                              </span>
                              <span className="font-bold text-sm text-slate-900">{dup.reason}</span>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              {dup.count} Rekod Terlibat
                            </span>
                          </div>

                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-700">Rekod Berkaitan: </span>
                            <span className="text-slate-600">
                              {dup.affected_records.map(r => r.label).join(' | ')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                            <span><strong>Cadangan Tindakan:</strong> {dup.recommended_action}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. IMPORT CSV (MULTI-STEP SAFE INGESTION ENGINE) */}
      {/* ========================================================================= */}
      {activeTab === 'import' && (
        <div className="space-y-6" id="section-import-csv">
          {importError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{importError}</span>
              </div>
              <button onClick={() => setImportError(null)} className="text-rose-700 hover:text-rose-900 text-xs font-semibold">Tutup</button>
            </div>
          )}

          {/* Step 1: Input CSV */}
          {importStep === 'INPUT' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Import Data CSV Selamat</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Muat naik fail CSV untuk menambah rekod secara pukal dengan pengesahan sintaks, normalisasi automatik, dan pengesanan duplikasi sebelum disimpan.
                </p>
              </div>

              {/* Entity Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Pilih Kategori Entiti
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setImportEntity('students')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importEntity === 'students'
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">Senarai Pelajar</div>
                    <div className="text-xs text-slate-500 mt-0.5">ID, Nama, Program, Sem, Telefon</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportEntity('studentskills')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importEntity === 'studentskills'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">Kemahiran Pelajar</div>
                    <div className="text-xs text-slate-500 mt-0.5">ID Pelajar, Bakat, Tahap Kemahiran</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportEntity('opportunities')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      importEntity === 'opportunities'
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-sm text-slate-900">Panggilan Terbuka</div>
                    <div className="text-xs text-slate-500 mt-0.5">Tajuk, Kategori, Peranan, Tarikh</div>
                  </button>
                </div>
              </div>

              {/* Upload or Paste */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    2. Muat Naik Fail .CSV atau Tampal Teks
                  </label>
                  <button
                    type="button"
                    onClick={() => setImportCsvText(sampleCSVTemplates[importEntity] || '')}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    + Muat Contoh Format CSV
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />

                  <textarea
                    id="textarea-import-csv"
                    rows={8}
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                    placeholder="student_id_number,full_name,programme,semester,class,gender,phone,email&#10;PDA-2502-012,MUHAMMAD DANISH BIN AZMAN,Diploma in Computer Science,2,DCS2A,LELAKI,012-3456789,danish@student.kpmbp.edu.my"
                    className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-preview-csv"
                  disabled={importing || !importCsvText.trim()}
                  onClick={handlePreviewCSV}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Eye className="w-4 h-4" />
                  {importing ? 'Menganalisis...' : 'Semak & Pra-tonton Data (Step 2)'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview & Validation Table */}
          {importStep === 'PREVIEW' && importPreviewData && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Pra-tonton & Pengesahan Data CSV</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Semak status setiap baris sebelum melaksanakan import kekal ke dalam pangkalan data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setImportStep('INPUT')}
                  className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  ← Kembali & Ubah CSV
                </button>
              </div>

              {/* Status Breakdown Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  onClick={() => setPreviewFilter('ALL')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    previewFilter === 'ALL' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-semibold opacity-80 uppercase">Semua Baris</div>
                  <div className="text-lg font-bold">{importPreviewData.total_rows}</div>
                </button>
                <button
                  onClick={() => setPreviewFilter('VALID')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    previewFilter === 'VALID' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <div className="text-[10px] font-semibold opacity-80 uppercase">Sah (Sedia Import)</div>
                  <div className="text-lg font-bold">{importPreviewData.valid_count}</div>
                </button>
                <button
                  onClick={() => setPreviewFilter('WARNING')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    previewFilter === 'WARNING' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  <div className="text-[10px] font-semibold opacity-80 uppercase">Amaran</div>
                  <div className="text-lg font-bold">{importPreviewData.warning_count}</div>
                </button>
                <button
                  onClick={() => setPreviewFilter('DUPLICATE')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    previewFilter === 'DUPLICATE' ? 'bg-purple-600 text-white border-purple-600' : 'bg-purple-50 text-purple-800 border-purple-200'
                  }`}
                >
                  <div className="text-[10px] font-semibold opacity-80 uppercase">Pendua (Dilepaskan)</div>
                  <div className="text-lg font-bold">{importPreviewData.duplicate_count}</div>
                </button>
                <button
                  onClick={() => setPreviewFilter('INVALID')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    previewFilter === 'INVALID' ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="text-[10px] font-semibold opacity-80 uppercase">Tidak Sah (Ditolak)</div>
                  <div className="text-lg font-bold">{importPreviewData.invalid_count}</div>
                </button>
              </div>

              {/* Rows Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold w-12">#</th>
                      <th className="py-2.5 px-3 font-bold w-28">Status</th>
                      <th className="py-2.5 px-3 font-bold">Data Ternormalisasi</th>
                      <th className="py-2.5 px-3 font-bold">Catatan Pengesahan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreviewData.rows
                      .filter(r => previewFilter === 'ALL' || r.status === previewFilter)
                      .map(row => (
                        <tr key={row.row_index} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-500">{row.row_index}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'VALID' ? 'bg-emerald-100 text-emerald-800' :
                              row.status === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                              row.status === 'DUPLICATE' ? 'bg-purple-100 text-purple-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {row.normalized_data.full_name || row.normalized_data.title || row.normalized_data.skill_name || 'Rekod'}
                            {row.normalized_data.student_id_number && (
                              <span className="text-slate-500 font-normal ml-1">({row.normalized_data.student_id_number})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{row.message}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Commit Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-600">
                  Sebanyak <strong>{importPreviewData.valid_count + importPreviewData.warning_count}</strong> rekod sah akan diimport.
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setImportStep('INPUT')}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    id="btn-confirm-commit-import"
                    disabled={importing || (importPreviewData.valid_count + importPreviewData.warning_count) === 0}
                    onClick={handleCommitImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {importing ? 'Menyimpan...' : 'Sahkan & Laksana Import (Step 3)'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Result Summary */}
          {importStep === 'RESULT' && importResult && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Proses Import Selesai</h3>
                  <p className="text-xs text-slate-500">{importResult.message}</p>
                </div>
              </div>

              {/* Metric Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-emerald-800 uppercase">Berjaya Diimport</div>
                  <div className="text-2xl font-bold text-emerald-900 mt-1">{importResult.imported}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-purple-800 uppercase">Pendua Dilepaskan</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">{importResult.duplicate}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-slate-700 uppercase">Dilepaskan / Lain-lain</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{importResult.skipped}</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
                  <div className="text-xs font-semibold text-rose-800 uppercase">Tidak Sah</div>
                  <div className="text-2xl font-bold text-rose-900 mt-1">{importResult.invalid}</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-rose-900 mb-1">Log Pengecualian:</div>
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-rose-800">• {err}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  id="btn-import-another"
                  onClick={() => {
                    setImportStep('INPUT');
                    setImportCsvText('');
                    setImportPreviewData(null);
                    setImportResult(null);
                  }}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Import Fail CSV Lain
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
