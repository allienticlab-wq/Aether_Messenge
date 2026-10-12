import { ChatBackgroundConfig } from '../types/index.js';

export interface ThemePreset {
  id: string;
  name: string;
  config: ChatBackgroundConfig;
  previewClass: string;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  url: string;
  pattern: 'none' | 'grid' | 'dots' | 'scanlines';
}

export const GRADIENT_PRESETS: ThemePreset[] = [
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    previewClass: 'from-pink-500 via-cyan-500 to-slate-950',
    config: {
      type: 'preset-gradient',
      name: 'Cyberpunk Neon',
      value: 'radial-gradient(circle at 10% 20%, rgba(236, 72, 153, 0.28) 0%, rgba(6, 182, 212, 0.22) 40%, rgba(2, 6, 23, 0.95) 85%)',
      pattern: 'grid',
      overlayDim: 0.35,
    },
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    previewClass: 'from-indigo-600 via-purple-900 to-slate-950',
    config: {
      type: 'preset-gradient',
      name: 'Deep Space Nebula',
      value: 'radial-gradient(ellipse at 50% 10%, rgba(99, 102, 241, 0.35) 0%, rgba(30, 27, 75, 0.8) 50%, rgba(2, 6, 23, 0.98) 90%)',
      pattern: 'dots',
      overlayDim: 0.3,
    },
  },
  {
    id: 'quantum-emerald',
    name: 'Quantum Emerald',
    previewClass: 'from-emerald-500 via-teal-900 to-slate-950',
    config: {
      type: 'preset-gradient',
      name: 'Quantum Emerald',
      value: 'radial-gradient(circle at 75% 25%, rgba(16, 185, 129, 0.3) 0%, rgba(4, 47, 46, 0.75) 45%, rgba(2, 6, 23, 0.98) 85%)',
      pattern: 'circuit',
      overlayDim: 0.3,
    },
  },
  {
    id: 'hyperdrive-cyan',
    name: 'Hyperdrive Cyan',
    previewClass: 'from-cyan-400 via-blue-600 to-indigo-950',
    config: {
      type: 'preset-gradient',
      name: 'Hyperdrive Cyan',
      value: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.2) 30%, rgba(79, 70, 229, 0.15) 70%, rgba(2, 6, 23, 0.98) 100%)',
      pattern: 'grid',
      overlayDim: 0.25,
    },
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    previewClass: 'from-amber-500 via-orange-700 to-slate-950',
    config: {
      type: 'preset-gradient',
      name: 'Solar Flare',
      value: 'radial-gradient(circle at 80% 20%, rgba(249, 115, 22, 0.3) 0%, rgba(185, 28, 28, 0.25) 40%, rgba(2, 6, 23, 0.96) 80%)',
      pattern: 'dots',
      overlayDim: 0.35,
    },
  },
  {
    id: 'synthwave-twilight',
    name: 'Synthwave',
    previewClass: 'from-purple-500 via-pink-600 to-slate-950',
    config: {
      type: 'preset-gradient',
      name: 'Synthwave Twilight',
      value: 'linear-gradient(180deg, rgba(168, 85, 247, 0.28) 0%, rgba(219, 39, 119, 0.22) 45%, rgba(15, 23, 42, 0.95) 85%)',
      pattern: 'scanlines',
      overlayDim: 0.35,
    },
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    previewClass: 'from-teal-400 via-emerald-600 to-indigo-950',
    config: {
      type: 'preset-gradient',
      name: 'Aurora Borealis',
      value: 'radial-gradient(ellipse at 50% 0%, rgba(52, 211, 153, 0.25) 0%, rgba(6, 182, 212, 0.2) 35%, rgba(30, 27, 75, 0.4) 65%, rgba(2, 6, 23, 0.98) 95%)',
      pattern: 'dots',
      overlayDim: 0.25,
    },
  },
  {
    id: 'obsidian-stealth',
    name: 'Obsidian Stealth',
    previewClass: 'from-slate-800 via-slate-900 to-black',
    config: {
      type: 'preset-gradient',
      name: 'Obsidian Stealth',
      value: 'linear-gradient(145deg, #090d16 0%, #030712 50%, #080a11 100%)',
      pattern: 'hexagons',
      overlayDim: 0.2,
    },
  },
];

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'neon-city',
    name: 'Neo Tokyo Night',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    pattern: 'grid',
  },
  {
    id: 'orbital-earth',
    name: 'Orbital View',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    pattern: 'dots',
  },
  {
    id: 'cosmic-starscape',
    name: 'Cosmic Starscape',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=80',
    pattern: 'none',
  },
  {
    id: 'holographic-flow',
    name: 'Holo Flow',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    pattern: 'none',
  },
  {
    id: 'cyber-circuitry',
    name: 'Cyber Mesh',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    pattern: 'scanlines',
  },
];

/**
 * Returns CSS style object for pattern overlays
 */
export const getPatternStyle = (pattern?: string): React.CSSProperties => {
  switch (pattern) {
    case 'grid':
      return {
        backgroundImage: `linear-gradient(to right, rgba(6, 182, 212, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(6, 182, 212, 0.08) 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      };
    case 'dots':
      return {
        backgroundImage: `radial-gradient(rgba(56, 189, 248, 0.16) 1.2px, transparent 1.2px)`,
        backgroundSize: '20px 20px',
      };
    case 'hexagons':
      return {
        backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.08) 10%, transparent 11%), radial-gradient(circle at bottom left, rgba(148, 163, 184, 0.08) 10%, transparent 11%), radial-gradient(circle at bottom right, rgba(148, 163, 184, 0.08) 10%, transparent 11%), radial-gradient(circle at top left, rgba(148, 163, 184, 0.08) 10%, transparent 11%), radial-gradient(circle at top right, rgba(148, 163, 184, 0.08) 10%, transparent 11%)`,
        backgroundSize: '28px 28px',
      };
    case 'circuit':
      return {
        backgroundImage: `linear-gradient(45deg, rgba(16, 185, 129, 0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(16, 185, 129, 0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(16, 185, 129, 0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(16, 185, 129, 0.06) 75%)`,
        backgroundSize: '32px 32px',
      };
    case 'scanlines':
      return {
        backgroundImage: `repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.28) 0px, rgba(0, 0, 0, 0.28) 1px, transparent 1px, transparent 3px)`,
      };
    default:
      return {};
  }
};
