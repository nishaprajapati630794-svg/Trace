export type ColorTheme = 'light' | 'violet' | 'emerald' | 'sapphire';

export interface ThemeConfig {
  id: ColorTheme;
  name: string;
  isDark: boolean;
  accent: string;
  accentGradient: string;
  badgeBg: string;
  badgeText: string;
  bgCanvas: string;
  bgCard: string;
  bgSubtle: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  glowColor: string;
}

export const THEMES: Record<ColorTheme, ThemeConfig> = {
  light: {
    id: 'light',
    name: 'Light Violet',
    isDark: false,
    accent: '#8b5cf6',
    accentGradient: 'from-rose-500 via-pink-500 to-indigo-600',
    badgeBg: 'bg-violet-100',
    badgeText: 'text-violet-700',
    bgCanvas: 'bg-[#f5f3ff]',
    bgCard: 'bg-white',
    bgSubtle: 'bg-[#ede9fe]/60',
    borderColor: 'border-violet-200',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-400',
    glowColor: 'rgba(139, 92, 246, 0.15)',
  },
  violet: {
    id: 'violet',
    name: 'Neon Violet',
    isDark: true,
    accent: '#8b5cf6',
    accentGradient: 'from-violet-600 via-indigo-600 to-cyan-500',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-400',
    bgCanvas: 'bg-[#090b14]',
    bgCard: 'bg-[#0f1222]/90',
    bgSubtle: 'bg-[#151930]',
    borderColor: 'border-violet-500/20',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    glowColor: 'rgba(139, 92, 246, 0.2)',
  },
  emerald: {
    id: 'emerald',
    name: 'Cyber Mint',
    isDark: true,
    accent: '#10b981',
    accentGradient: 'from-emerald-500 via-teal-500 to-cyan-400',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    bgCanvas: 'bg-[#050d0a]',
    bgCard: 'bg-[#0a1813]/90',
    bgSubtle: 'bg-[#0f241d]',
    borderColor: 'border-emerald-500/20',
    textPrimary: 'text-emerald-50',
    textSecondary: 'text-emerald-300/70',
    textMuted: 'text-emerald-500/60',
    glowColor: 'rgba(16, 185, 129, 0.2)',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Ocean Sapphire',
    isDark: true,
    accent: '#38bdf8',
    accentGradient: 'from-blue-600 via-sky-500 to-teal-400',
    badgeBg: 'bg-sky-500/10',
    badgeText: 'text-sky-400',
    bgCanvas: 'bg-[#050c18]',
    bgCard: 'bg-[#0b162c]/90',
    bgSubtle: 'bg-[#102040]',
    borderColor: 'border-sky-500/20',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    glowColor: 'rgba(56, 189, 248, 0.2)',
  },
};
