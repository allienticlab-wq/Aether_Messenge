import React, { useState } from 'react';
import { Clock, Trash2, Send, X, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { ScheduledMessage } from '../../types/index.js';

interface ScheduledMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledMessages: ScheduledMessage[];
  onCancel: (scheduledId: string) => Promise<void>;
  onSendNow: (scheduledId: string) => Promise<void>;
}

export const ScheduledMessagesModal: React.FC<ScheduledMessagesModalProps> = ({
  isOpen,
  onClose,
  scheduledMessages,
  onCancel,
  onSendNow,
}) => {
  if (!isOpen) return null;

  const [busyId, setBusyId] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    setBusyId(id);
    try {
      await onCancel(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleSendNow = async (id: string) => {
    setBusyId(id);
    try {
      await onSendNow(id);
    } finally {
      setBusyId(null);
    }
  };

  const formatScheduledTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Scheduled Messages</h3>
              <p className="text-xs text-slate-400">
                {scheduledMessages.length} message{scheduledMessages.length !== 1 ? 's' : ''} queued for auto-sending
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {scheduledMessages.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm text-slate-300 font-medium">No scheduled messages</p>
              <p className="text-xs text-slate-500 mt-1">
                Use the schedule icon in the message composer to schedule messages for future dispatch.
              </p>
            </div>
          ) : (
            scheduledMessages.map((item) => (
              <div
                key={item.id}
                className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-3.5 transition flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/40">
                    <Calendar className="w-3.5 h-3.5" />
                    Sends: {formatScheduledTime(item.scheduledFor)}
                  </span>
                  <span className="text-[10px] text-slate-500">ID: {item.id.slice(-6)}</span>
                </div>

                {item.text && (
                  <p className="text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 whitespace-pre-wrap">
                    {item.text}
                  </p>
                )}

                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span>{item.attachments.length} attachment(s)</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => handleCancel(item.id)}
                    disabled={busyId === item.id}
                    className="px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg transition cursor-pointer flex items-center gap-1"
                    title="Cancel scheduled message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSendNow(item.id)}
                    disabled={busyId === item.id}
                    className="px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-100 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800/60 rounded-lg transition cursor-pointer flex items-center gap-1"
                    title="Send message right now"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Now
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
