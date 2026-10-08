import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  RotateCw,
  ZoomIn,
  ZoomOut,
  X,
  Check,
  Trash2,
  RefreshCw,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';

interface PhotoUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoUrl?: string;
  onPhotoSelected: (photoUrl: string) => void;
  title?: string;
  aspectRatio?: 'circle' | 'square' | 'banner';
}

const PRESET_AVATARS = [
  // Curated diverse high-resolution avatars
  { id: 'av_1', category: '3D Character', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_2', category: '3D Character', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_3', category: 'Professional', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_4', category: 'Professional', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_5', category: 'Tech Creative', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_6', category: 'Tech Creative', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_7', category: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_8', category: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_9', category: 'Minimalist', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_10', category: 'Minimalist', url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_11', category: 'Abstract 3D', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&h=400&q=85' },
  { id: 'av_12', category: 'Abstract 3D', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=400&h=400&q=85' },
];

const FILTERS = [
  { id: 'none', label: 'Normal', filter: 'none' },
  { id: 'vibrant', label: 'Vibrant', filter: 'saturate(1.4) contrast(1.1)' },
  { id: 'cyber', label: 'Neon Cyber', filter: 'hue-rotate(180deg) contrast(1.2)' },
  { id: 'warm', label: 'Warm Glow', filter: 'sepia(0.25) saturate(1.3)' },
  { id: 'noir', label: 'Noir B&W', filter: 'grayscale(1) contrast(1.25)' },
  { id: 'cool', label: 'Cool Chill', filter: 'hue-rotate(210deg) brightness(1.05)' },
];

export const PhotoUploaderModal: React.FC<PhotoUploaderModalProps> = ({
  isOpen,
  onClose,
  currentPhotoUrl,
  onPhotoSelected,
  title = 'Change Photo',
  aspectRatio = 'circle',
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'presets'>('upload');
  const [previewImage, setPreviewImage] = useState<string | null>(currentPhotoUrl || null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [customUrlInput, setCustomUrlInput] = useState<string>('');

  // Camera stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync current photo when opened
  useEffect(() => {
    if (isOpen) {
      setPreviewImage(currentPhotoUrl || null);
      setZoom(1);
      setRotation(0);
      setSelectedFilter('none');
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen, currentPhotoUrl]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        stopCamera();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser settings.'
          : 'Unable to access camera device. Make sure your webcam is connected.'
      );
      setIsCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Handle switching tabs
  const handleTabChange = (tab: 'upload' | 'camera' | 'presets') => {
    setActiveTab(tab);
    if (tab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Capture photo from live camera video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop center square
    const sx = ((video.videoWidth || 640) - size) / 2;
    const sy = ((video.videoHeight || 640) - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreviewImage(dataUrl);
    stopCamera();
    setActiveTab('upload');
  };

  // File picker handler with automatic resizing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress to max 800x800 for high quality profile image
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.88);
          setPreviewImage(compressed);
        } else {
          setPreviewImage(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Apply edits and export final canvas image
  const handleApply = () => {
    if (!previewImage) {
      onPhotoSelected('');
      onClose();
      return;
    }

    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 512;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onPhotoSelected(previewImage);
        setIsProcessing(false);
        onClose();
        return;
      }

      ctx.save();
      // Apply filters if any
      const activeFilterObj = FILTERS.find((f) => f.id === selectedFilter);
      if (activeFilterObj && activeFilterObj.filter !== 'none') {
        ctx.filter = activeFilterObj.filter;
      }

      // Translate to center for rotation & scaling
      ctx.translate(size / 2, size / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Draw image centered
      const drawSize = size;
      ctx.drawImage(img, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();

      const finalUrl = canvas.toDataURL('image/jpeg', 0.9);
      onPhotoSelected(finalUrl);
      setIsProcessing(false);
      onClose();
    };
    img.onerror = () => {
      // If crossOrigin blocks or fallback
      onPhotoSelected(previewImage);
      setIsProcessing(false);
      onClose();
    };
    img.src = previewImage;
  };

  const handleRemovePhoto = () => {
    setPreviewImage(null);
    onPhotoSelected('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden text-slate-100 max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">{title}</h3>
              <p className="text-xs text-slate-400">Upload, snap with camera, or pick a custom avatar</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-3 flex gap-2 border-b border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => handleTabChange('upload')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-lg transition border-b-2 ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload & Adjust</span>
          </button>
          <button
            onClick={() => handleTabChange('camera')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-lg transition border-b-2 ${
              activeTab === 'camera'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Take Photo</span>
          </button>
          <button
            onClick={() => handleTabChange('presets')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-t-lg transition border-b-2 ${
              activeTab === 'presets'
                ? 'border-cyan-400 text-cyan-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Avatar Presets</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* TAB 1: UPLOAD & ADJUST */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Preview Canvas / Area */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950/70 border border-slate-800/90 rounded-2xl">
                {previewImage ? (
                  <div className="relative group flex items-center justify-center">
                    <div
                      className={`overflow-hidden border-4 border-cyan-500/50 shadow-xl transition-all ${
                        aspectRatio === 'circle' ? 'rounded-full w-48 h-48' : 'rounded-2xl w-56 h-56'
                      }`}
                    >
                      <img
                        src={previewImage}
                        alt="Preview"
                        style={{
                          transform: `scale(${zoom}) rotate(${rotation}deg)`,
                          filter: FILTERS.find((f) => f.id === selectedFilter)?.filter || 'none',
                        }}
                        className="w-full h-full object-cover transition-transform duration-150"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-48 h-48 rounded-full border-2 border-dashed border-slate-700 hover:border-cyan-500 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/50 hover:bg-cyan-950/20 text-slate-400 hover:text-cyan-300 group"
                  >
                    <Upload className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">Click to upload photo</span>
                    <span className="text-[10px] text-slate-500 mt-1">PNG, JPG, WebP up to 10MB</span>
                  </div>
                )}

                {/* Quick actions underneath preview */}
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose File</span>
                  </button>
                  {previewImage && (
                    <button
                      type="button"
                      onClick={() => setRotation((prev) => (prev + 90) % 360)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}
                  {previewImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setRotation(0);
                        setSelectedFilter('none');
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      title="Reset adjustments"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Adjustments: Zoom & Filters (if image loaded) */}
              {previewImage && (
                <div className="space-y-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Zoom Scale</span>
                    </span>
                    <span className="font-mono text-cyan-400">{zoom.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />

                  {/* Filter chips */}
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Color Filters:</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {FILTERS.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setSelectedFilter(f.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                            selectedFilter === f.id
                              ? 'bg-cyan-500 text-slate-950 font-bold'
                              : 'bg-slate-800/90 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Direct Web Image URL fallback */}
              <div className="pt-1">
                <label className="text-[11px] text-slate-400 block mb-1">Or paste direct image URL:</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        setPreviewImage(customUrlInput.trim());
                        setCustomUrlInput('');
                      }
                    }}
                    className="px-3 py-1.5 bg-cyan-950 text-cyan-400 border border-cyan-800 hover:bg-cyan-900/60 rounded-lg text-xs font-medium transition"
                  >
                    Load
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE CAMERA CAPTURE */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-square max-w-[340px] mx-auto border border-slate-800 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Circular Framing Overlay */}
                <div className="absolute inset-0 border-4 border-cyan-400/30 rounded-full pointer-events-none" />

                {cameraError && (
                  <div className="absolute inset-0 bg-slate-950/90 p-4 flex flex-col items-center justify-center text-center text-xs text-rose-300">
                    <p className="mb-3">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-rose-950 border border-rose-800 rounded-lg text-rose-200 font-medium"
                    >
                      Retry Camera
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!isCameraActive}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Photo</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AVATAR PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Select an authentic modern profile avatar:</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto p-1">
                {PRESET_AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      setPreviewImage(av.url);
                      setActiveTab('upload');
                    }}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition group hover:scale-105 ${
                      previewImage === av.url ? 'border-cyan-400 ring-2 ring-cyan-400/40' : 'border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <img src={av.url} alt={av.category} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                      <span className="text-[10px] text-cyan-300 font-medium truncate">{av.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div>
            {currentPhotoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={isProcessing}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : 'Save Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
