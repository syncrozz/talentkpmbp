import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, AlertCircle, CheckCircle2, Star, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { FeedbackRole, FeedbackType, PilotFeedback } from '../types.ts';

interface PilotFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: FeedbackRole;
  userIdentifier?: string;
  userName?: string;
  pageContext?: string;
  onFeedbackSubmitted?: (feedback: PilotFeedback) => void;
}

export const PilotFeedbackModal: React.FC<PilotFeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'STUDENT',
  userIdentifier = '',
  userName = '',
  pageContext = 'Portal Pelajar',
  onFeedbackSubmitted,
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('USABILITY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Sila isi tajuk ringkas dan huraian maklum balas anda.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: defaultRole,
          user_identifier: userIdentifier || 'ANONYMOUS',
          user_name: userName || (defaultRole === 'STUDENT' ? 'Pelajar KPMBP' : 'Pentadbir KPMBP'),
          feedback_type: feedbackType,
          title: title.trim(),
          description: description.trim(),
          page_context: pageContext,
          rating,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghantar maklum balas.');
      }

      setSuccessMsg(data.message || 'Maklum balas anda telah direkodkan. Terima kasih atas sumbangan pilot anda!');
      if (onFeedbackSubmitted && data.feedback) {
        onFeedbackSubmitted(data.feedback);
      }

      setTimeout(() => {
        setSuccessMsg(null);
        setTitle('');
        setDescription('');
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat sambungan. Sila cuba sebentar lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Pusat Maklum Balas Pilot</h3>
              <p className="text-xs text-slate-400">SES 4.4 Pilot Observation & Quality Gate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMsg ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{successMsg}</div>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center space-x-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Context Information Badge */}
              <div className="flex items-center justify-between text-xs bg-slate-800/60 border border-slate-700/60 px-3 py-2 rounded-lg">
                <span className="text-slate-400">Peranan: <strong className="text-amber-400">{defaultRole}</strong></span>
                <span className="text-slate-400">Konteks Skrin: <strong className="text-slate-200">{pageContext}</strong></span>
              </div>

              {/* Feedback Type Category Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Kategori Isu / Maklum Balas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'USABILITY', label: 'Kebolehgunaan', icon: Sparkles },
                    { id: 'BUG', label: 'Pepijat / Ralat', icon: ShieldAlert },
                    { id: 'WORKFLOW_ISSUE', label: 'Aliran Kerja', icon: HelpCircle },
                    { id: 'DATA_ISSUE', label: 'Isu Data', icon: AlertCircle },
                    { id: 'CONTENT_ISSUE', label: 'Kandungan Teks', icon: MessageSquarePlus },
                    { id: 'ENHANCEMENT', label: 'Penambahbaikan', icon: Star },
                  ].map(t => {
                    const Icon = t.icon;
                    const isSelected = feedbackType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFeedbackType(t.id as FeedbackType)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Tajuk Ringkas <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: Butang mohon lambat bertindak balas pada telefon"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  maxLength={120}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Huraian Terperinci <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Terangkan apa yang berlaku, jangkaan anda, atau bahagian yang mengelirukan..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                  required
                />
              </div>

              {/* User Experience Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tahap Kepuasan Pengalaman (1-5 Bintang)
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1.5 focus:outline-none transition"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-slate-400 ml-2">
                    {rating === 5 ? 'Sangat Lancar' : rating === 4 ? 'Baik' : rating === 3 ? 'Sederhana' : rating === 2 ? 'Ada Halangan' : 'Sukar Digunakan'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 hover:to-amber-500 transition shadow-lg shadow-amber-500/20 flex items-center space-x-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menghantar...' : 'Hantar Maklum Balas'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
