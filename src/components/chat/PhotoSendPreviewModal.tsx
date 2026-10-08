import React, { useState } from 'react';
import { X, Send, Sparkles, Smile, RotateCw } from 'lucide-react';
import { Attachment } from '../../types/index.js';

interface PhotoSendPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: {
    dataUrl: string;
    name: string;
    size: number;
    mimeType: string;
  } | null;
  onSend: (caption: string, attachment: Attachment) => Promise<void>;
}

export const PhotoSendPreviewModal: React.FC<PhotoSendPreviewModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  onSend,
}) => {
  const [caption, setCaption] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !imageFile) return null;

  const handleSend = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      const att: Attachment = {
        id: `att_${Date.now()}`,
        name: imageFile.name,
        url: imageFile.dataUrl,
        type: 'image',
        mimeType: imageFile.mimeType,
        size: imageFile.size,
      };
      await onSend(caption.trim(), att);
      setCaption('');
      setRotation(0);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="font-medium text-xs text-slate-300 truncate max-w-xs">{imageFile.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">({formatSize(imageFile.size)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Rotate image"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="relative bg-slate-950/90 p-4 flex items-center justify-center min-h-[260px] max-h-[380px] overflow-hidden">
          <img
            src={imageFile.dataUrl}
            alt="Preview"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.15s ease-out',
            }}
            className="max-h-[340px] max-w-full object-contain rounded-xl shadow-lg"
          />
        </div>

        {/* Caption & Send Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800/90 space-y-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 focus-within:border-cyan-500 transition">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Add a caption..."
              className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">Press Enter or click send</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Sending...' : 'Send Photo'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
