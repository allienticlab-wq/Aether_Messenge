import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Copy, Check, Key, QrCode, RefreshCw, X } from 'lucide-react';
import { getSafetyFingerprint, exportChatKeyHex, importChatKeyHex } from '../../lib/e2ee.js';

interface E2EESafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
}

export const E2EESafetyModal: React.FC<E2EESafetyModalProps> = ({
  isOpen,
  onClose,
  chatId,
  chatName,
}) => {
  const [fingerprint, setFingerprint] = useState<string>('Loading safety numbers...');
  const [copied, setCopied] = useState(false);
  const [exportKey, setExportKey] = useState<string>('');
  const [showKey, setShowKey] = useState(false);
  const [importHex, setImportHex] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && chatId) {
      getSafetyFingerprint(chatId).then(setFingerprint);
      exportChatKeyHex(chatId).then(setExportKey);
      setImportStatus(null);
      setImportHex('');
    }
  }, [isOpen, chatId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(fingerprint.replace(/\s+/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportKey = async () => {
    if (!importHex.trim()) return;
    const success = await importChatKeyHex(chatId, importHex);
    if (success) {
      setImportStatus('Key updated successfully! Re-generating safety numbers...');
      const newFp = await getSafetyFingerprint(chatId);
      const newExp = await exportChatKeyHex(chatId);
      setFingerprint(newFp);
      setExportKey(newExp);
    } else {
      setImportStatus('Invalid key format. Must be a 64-character hex string (256-bit AES key).');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight text-slate-100">End-to-End Encryption Verification</h3>
              <p className="text-[11px] text-slate-400">AES-256-GCM Hardware-Isolated Cryptographic Key</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Badge */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center gap-3">
          <Lock className="w-5 h-5 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <span className="text-xs text-slate-400 block">Conversation</span>
            <span className="font-semibold text-xs text-slate-200 truncate block">{chatName}</span>
          </div>
        </div>

        {/* Safety Fingerprint Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>Safety Verification Numbers</span>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950/90 border border-slate-800/90 rounded-2xl font-mono text-xs text-cyan-300 text-center tracking-wider leading-relaxed shadow-inner break-all select-all">
            {fingerprint}
          </div>
          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            To verify that messages in this chat are end-to-end encrypted, compare these numbers with the recipient's device.
          </p>
        </div>

        {/* Key Export / Import Accordion */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <button
            onClick={() => setShowKey(!showKey)}
            className="text-xs font-medium text-slate-400 hover:text-cyan-300 transition flex items-center justify-between w-full"
          >
            <span>Advanced Key Management (Hex Export/Import)</span>
            <span>{showKey ? '▲' : '▼'}</span>
          </button>

          {showKey && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Raw Key Hex (256-bit)</span>
                <div className="p-2 bg-slate-950 font-mono text-[10px] text-slate-400 break-all rounded-xl border border-slate-800 select-all">
                  {exportKey}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Import Shared Passphrase Key</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste 64-character hex key..."
                    value={importHex}
                    onChange={(e) => setImportHex(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleImportKey}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Import
                  </button>
                </div>
                {importStatus && (
                  <p className={`text-[10px] ${importStatus.includes('successfully') ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {importStatus}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl text-xs transition cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
