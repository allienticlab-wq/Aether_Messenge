import React, { useState } from 'react';
import { Clock, Calendar, X, AlertCircle, Check } from 'lucide-react';
import { Attachment } from '../../types/index.js';

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageText: string;
  attachments?: Attachment[];
  onConfirmSchedule: (isoDateTime: string) => Promise<void>;
}

export const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
  isOpen,
  onClose,
  messageText,
  attachments = [],
  onConfirmSchedule,
}) => {
  if (!isOpen) return null;

  // Default time: 1 hour from now
  const getInitialDateTime = () => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localIso;
  };

  const [selectedDateTime, setSelectedDateTime] = useState<string>(getInitialDateTime());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick preset handlers
  const setPreset = (minutesFromNow: number, setHour?: number) => {
    const d = new Date();
    if (setHour !== undefined) {
      d.setDate(d.getDate() + (minutesFromNow > 1400 ? 1 : 0));
      d.setHours(setHour, 0, 0, 0);
    } else {
      d.setTime(d.getTime() + minutesFromNow * 60 * 1000);
    }
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    setSelectedDateTime(localIso);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetDate = new Date(selectedDateTime);
    if (isNaN(targetDate.getTime())) {
      setError('Please enter a valid date and time.');
      return;
    }

    if (targetDate.getTime() <= Date.now() + 5000) {
      setError('Scheduled time must be at least 5 seconds in the future.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirmSchedule(targetDate.toISOString());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format local display string
  const formatPreviewDate = () => {
    try {
      const d = new Date(selectedDateTime);
      if (isNaN(d.getTime())) return 'Invalid date';
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return selectedDateTime;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Schedule Message</h3>
              <p className="text-xs text-slate-400">Select future date & time for auto-dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Message Preview Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
              Message Content
            </span>
            <p className="text-xs text-slate-200 line-clamp-3 italic">
              "{messageText.trim() || (attachments.length ? `[${attachments.length} attachment(s)]` : 'Empty message')}"
            </p>
            {attachments.length > 0 && (
              <span className="inline-block mt-1.5 text-[11px] text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                📎 {attachments.length} file attached
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-2">Quick Presets</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreset(15)}
                className="px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-300 rounded-xl border border-slate-700/60 hover:border-cyan-500/40 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                ⚡ In 15 minutes
              </button>
              <button
                type="button"
                onClick={() => setPreset(60)}
                className="px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-300 rounded-xl border border-slate-700/60 hover:border-cyan-500/40 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                ⏱️ In 1 hour
              </button>
              <button
                type="button"
                onClick={() => setPreset(1440, 9)}
                className="px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-300 rounded-xl border border-slate-700/60 hover:border-cyan-500/40 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                🌅 Tomorrow 9:00 AM
              </button>
              <button
                type="button"
                onClick={() => setPreset(1440, 18)}
                className="px-3 py-2 text-xs font-medium bg-slate-800/80 hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-300 rounded-xl border border-slate-700/60 hover:border-cyan-500/40 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                🌆 Tomorrow 6:00 PM
              </button>
            </div>
          </div>

          {/* Custom Date & Time Selection */}
          <div>
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Custom Date & Time
            </label>
            <input
              type="datetime-local"
              value={selectedDateTime}
              onChange={(e) => {
                setSelectedDateTime(e.target.value);
                setError(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none transition"
              required
            />
            {selectedDateTime && (
              <p className="mt-1.5 text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Will send on: {formatPreviewDate()}
              </p>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedDateTime}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl shadow-lg shadow-cyan-950/50 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>Scheduling...</>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Schedule Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
