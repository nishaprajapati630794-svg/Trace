import React, { useState } from 'react';
import { Play, Pause, Zap, Trash2, Activity, Palette, Check } from 'lucide-react';
import { ActiveFault } from '../types/telemetry';
import { ColorTheme, THEMES } from '../types/theme';

interface HeaderProps {
  activeTab: 'topology' | 'metrics' | 'traces' | 'incidents';
  onTabChange: (tab: 'topology' | 'metrics' | 'traces' | 'incidents') => void;
  isRunning: boolean;
  onToggleRunning: () => void;
  tickRateMs: number;
  onChangeTickRate: (rate: number) => void;
  onOpenFaultModal: () => void;
  activeFaults: ActiveFault[];
  onClearFaults: () => void;
  anomalyDetected: boolean;
  currentTick: number;
  theme: ColorTheme;
  onChangeTheme: (theme: ColorTheme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isRunning,
  onToggleRunning,
  tickRateMs,
  onChangeTickRate,
  onOpenFaultModal,
  activeFaults,
  onClearFaults,
  anomalyDetected,
  currentTick,
  theme,
  onChangeTheme,
}) => {
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);
  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b backdrop-blur-xl px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 transition-all duration-300 ${
        isDark
          ? 'border-white/10 bg-[#070913]/90 text-white shadow-lg shadow-black/40'
          : 'border-slate-200/90 bg-white/90 text-slate-900 shadow-sm'
      }`}
    >
      {/* Zone 1: Single text element wordmark with clean subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-md ${
              isDark
                ? 'bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-violet-500/25 ring-1 ring-white/20'
                : 'bg-gradient-to-tr from-indigo-600 to-sky-500 text-white shadow-indigo-500/25'
            }`}
          >
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-base font-extrabold tracking-tight block ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                TraceGraph AI
              </span>
              <span
                className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded font-semibold tracking-wider ${
                  isDark ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                }`}
              >
                v2.0
              </span>
            </div>
            <span
              className={`text-[11px] block font-mono ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Spatial-Temporal GAT Microservice Anomaly Engine
            </span>
          </div>
        </div>

        {/* Live anomaly status ticker */}
        <div
          className={`hidden sm:flex items-center gap-2 pl-3 ml-2 border-l text-xs ${
            isDark ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              anomalyDetected
                ? 'bg-rose-500 animate-ping ring-4 ring-rose-500/30'
                : isRunning
                ? 'bg-emerald-400 ring-2 ring-emerald-400/20 shadow-xs shadow-emerald-400'
                : 'bg-slate-400'
            }`}
          />
          <span className="font-mono text-[11px]">
            {anomalyDetected ? (
              <span className="text-rose-500 font-bold animate-pulse">
                ANOMALY DETECTED (&tau; &ge; 0.75)
              </span>
            ) : (
              <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                Cluster Nominal
              </span>
            )}
          </span>
          <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
          <span
            className={`font-mono text-[11px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Tick #{currentTick}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation links */}
      <nav
        className={`flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl border text-xs font-medium transition-colors ${
          isDark
            ? 'bg-white/5 border-white/10 backdrop-blur-md'
            : 'bg-slate-100 border-slate-200/90'
        }`}
      >
        <button
          onClick={() => onTabChange('topology')}
          className={`px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === 'topology'
              ? isDark
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-sm shadow-violet-500/30'
                : 'bg-white text-slate-900 font-bold shadow-xs'
              : isDark
              ? 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Service Topology
        </button>
        <button
          onClick={() => onTabChange('metrics')}
          className={`px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === 'metrics'
              ? isDark
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-sm shadow-violet-500/30'
                : 'bg-white text-slate-900 font-bold shadow-xs'
              : isDark
              ? 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Temporal Window
        </button>
        <button
          onClick={() => onTabChange('traces')}
          className={`px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer ${
            activeTab === 'traces'
              ? isDark
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-sm shadow-violet-500/30'
                : 'bg-white text-slate-900 font-bold shadow-xs'
              : isDark
              ? 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          OTel Spans
        </button>
        <button
          onClick={() => onTabChange('incidents')}
          className={`px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'incidents'
              ? isDark
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-sm shadow-violet-500/30'
                : 'bg-white text-slate-900 font-bold shadow-xs'
              : isDark
              ? 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          Incidents & RCA
          {anomalyDetected && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
      </nav>

      {/* Zone 3: Primary operational controls + Theme Color Palette Switcher */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Color Palette Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowThemePicker(!showThemePicker)}
            title="Choose Color Theme"
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20'
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline font-mono text-[11px] font-semibold">{currentTheme.name}</span>
          </button>

          {showThemePicker && (
            <div
              className={`absolute right-0 mt-2 w-48 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl ${
                isDark
                  ? 'bg-[#0f1222]/95 border-white/15 text-white shadow-black/80'
                  : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/60'
              }`}
            >
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 block opacity-50">
                Color Themes
              </span>
              <div className="flex flex-col gap-1">
                {(Object.keys(THEMES) as ColorTheme[]).map((thmKey) => {
                  const thm = THEMES[thmKey];
                  const isSelected = theme === thmKey;
                  return (
                    <button
                      key={thmKey}
                      onClick={() => {
                        onChangeTheme(thmKey);
                        setShowThemePicker(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-white/10 text-white font-bold'
                            : 'bg-slate-100 text-slate-900 font-bold'
                          : isDark
                          ? 'text-slate-400 hover:text-white hover:bg-white/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: thm.accent }}
                        />
                        <span>{thm.name}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Tick speed selector */}
        <div
          className={`hidden md:flex items-center gap-1 border rounded-xl px-2 py-1 text-xs ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Tick:
          </span>
          <button
            onClick={() => onChangeTickRate(500)}
            className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
              tickRateMs === 500
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            0.5s
          </button>
          <button
            onClick={() => onChangeTickRate(1000)}
            className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
              tickRateMs === 1000
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1.0s
          </button>
          <button
            onClick={() => onChangeTickRate(2000)}
            className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
              tickRateMs === 2000
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2.0s
          </button>
        </div>

        {/* Play/Pause stream */}
        <button
          onClick={onToggleRunning}
          title={isRunning ? 'Pause Telemetry Stream' : 'Resume Telemetry Stream'}
          className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-95 ${
            isRunning
              ? isDark
                ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              : 'bg-emerald-500 border-emerald-400 text-white hover:bg-emerald-400 shadow-md shadow-emerald-500/30'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          <span className="hidden sm:inline">{isRunning ? 'Pause' : 'Stream'}</span>
        </button>

        {/* Active Faults indicator / Clear */}
        {activeFaults.length > 0 && (
          <button
            onClick={onClearFaults}
            title="Clear all active synthetic faults"
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all animate-pulse cursor-pointer shadow-xs shadow-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset ({activeFaults.length})</span>
          </button>
        )}

        {/* Fault Injector CTA */}
        <button
          onClick={onOpenFaultModal}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-600 hover:opacity-90 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-white/20"
        >
          <Zap className="w-3.5 h-3.5 fill-current animate-bounce" />
          <span>Inject Fault</span>
        </button>
      </div>
    </header>
  );
};
