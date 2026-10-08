import React, { useState } from 'react';
import { TraceRecord, Span } from '../types/telemetry';
import { Network, AlertCircle, Clock, Tag } from 'lucide-react';
import { ColorTheme, THEMES } from '../types/theme';

interface TraceWaterfallViewProps {
  traces: TraceRecord[];
  theme?: ColorTheme;
}

export const TraceWaterfallView: React.FC<TraceWaterfallViewProps> = ({ traces, theme = 'violet' }) => {
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;
  const activeTrace = traces.find((t) => t.traceId === selectedTraceId) || traces[0];

  if (!activeTrace) {
    return (
      <div
        className={`w-full rounded-2xl border p-8 flex flex-col items-center justify-center text-center transition-colors ${
          isDark
            ? 'border-slate-800 bg-slate-900/40 text-slate-300'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm'
        }`}
      >
        <Network className="w-8 h-8 text-slate-400 mb-2" />
        <h4 className="text-sm font-semibold">No Distributed Traces Captured</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Run the telemetry simulator to generate live OpenTelemetry spans and trace waterfalls.
        </p>
      </div>
    );
  }

  const maxDuration = Math.max(1, activeTrace.totalDurationMs);

  return (
    <div
      className={`w-full flex flex-col gap-6 rounded-2xl border p-5 sm:p-6 transition-colors duration-200 shadow-xl ${
        isDark
          ? 'bg-slate-950 border-slate-800/80 text-white shadow-black/30'
          : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-200/50'
      }`}
    >
      {/* Top Header & Trace Selector */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 transition-colors ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDark
                ? 'bg-indigo-950/80 border border-indigo-700/60 text-indigo-400'
                : 'bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-xs'
            }`}
          >
            <Network className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">
                OpenTelemetry Distributed Traces
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-bold border transition-colors ${
                  activeTrace.status === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                }`}
              >
                {activeTrace.status === 'error' ? 'Status: 504 / 500 (Error)' : 'Status: 200 OK'}
              </span>
            </div>
            <p
              className={`text-xs font-mono mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Operation: <span className={isDark ? 'text-slate-200 font-semibold' : 'text-slate-800 font-semibold'}>{activeTrace.operation}</span> · Total Duration: <span className="font-bold">{activeTrace.totalDurationMs}ms</span>
            </p>
          </div>
        </div>

        {/* Trace select dropdown */}
        <div className="flex items-center gap-2">
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Recent Traces:
          </span>
          <select
            value={activeTrace.traceId}
            onChange={(e) => setSelectedTraceId(e.target.value)}
            className={`text-xs rounded-xl px-3 py-1.5 font-mono border focus:outline-none transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-200 focus:border-indigo-500'
                : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-indigo-600'
            }`}
          >
            {traces.map((t) => (
              <option key={t.traceId} value={t.traceId}>
                {t.status === 'error' ? '🔴' : '🟢'} {t.traceId.slice(0, 16)}… ({t.totalDurationMs}ms)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spans Waterfall Chart */}
      <div className="flex flex-col gap-3">
        <div
          className={`flex flex-wrap items-center justify-between text-xs font-mono px-2 gap-2 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Service Execution Durations
            </span>
            <span className="text-[11px] opacity-75">(All lines aligned to left for instant comparison)</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>0 ms (Start)</span>
            <span>{Math.round(maxDuration / 2)} ms</span>
            <span>{maxDuration} ms (Total)</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {activeTrace.spans.map((span, idx) => {
            const isError = span.statusCode >= 500;
            const widthPct = Math.max(4, Math.min(100, (span.durationMs / maxDuration) * 100));
            const isSelected = selectedSpan?.spanId === span.spanId;

            return (
              <div
                key={span.spanId}
                onClick={() => setSelectedSpan(span)}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.008] ${
                  isSelected
                    ? isDark
                      ? 'bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-indigo-50/70 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                    : isError
                    ? isDark
                      ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                      : 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                    : isDark
                    ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-100/50'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-2">
                  <div className="flex items-center gap-2 font-mono" style={{ paddingLeft: `${idx * 14}px` }}>
                    <span className="text-indigo-500 font-bold">&bull;</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {span.serviceName}
                    </span>
                    <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>
                      ({span.operationName})
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        isError
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                      }`}
                    >
                      {span.statusCode}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-3 font-mono text-[11px] ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    <span className="text-[10px] opacity-70">offset: +{span.startTimeOffsetMs}ms</span>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span className={isDark ? 'text-white' : 'text-slate-900'}>{span.durationMs}ms</span>
                      <span className="opacity-70 font-normal">({Math.round((span.durationMs / maxDuration) * 100)}%)</span>
                    </div>
                  </div>
                </div>

                {/* Left-Aligned Duration Bar: Starts cleanly from left (0%) */}
                <div
                  className={`relative w-full h-3.5 rounded-full overflow-hidden border transition-colors ${
                    isDark
                      ? 'bg-slate-950 border-slate-800/80'
                      : 'bg-slate-200/80 border-slate-300/80'
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      isError
                        ? 'bg-gradient-to-r from-rose-500 via-rose-600 to-rose-400'
                        : 'bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400'
                    }`}
                    style={{
                      width: `${widthPct}%`,
                    }}
                  />
                </div>

                {span.error && (
                  <div className="mt-2 text-[11px] text-rose-500 font-mono bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{span.error}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Span Details Inspector */}
      {selectedSpan && (
        <div
          className={`rounded-xl border p-4 text-xs font-mono transition-colors animate-in fade-in duration-200 ${
            isDark
              ? 'bg-slate-900/70 border-slate-800 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-2 mb-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Tag className="w-3.5 h-3.5 text-indigo-500" /> Span Attributes: {selectedSpan.spanId}
            </span>
            <button
              onClick={() => setSelectedSpan(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="text-slate-400 block">Service:</span>
              <span className="font-semibold">{selectedSpan.serviceName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Operation:</span>
              <span className="font-semibold">{selectedSpan.operationName}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Duration:</span>
              <span className="font-semibold">{selectedSpan.durationMs}ms</span>
            </div>
            <div>
              <span className="text-slate-400 block">Status:</span>
              <span className={selectedSpan.statusCode >= 500 ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                {selectedSpan.statusCode}
              </span>
            </div>
            {Object.entries(selectedSpan.attributes).map(([k, v]) => (
              <div key={k}>
                <span className="text-slate-400 block">{k}:</span>
                <span className="break-all">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
