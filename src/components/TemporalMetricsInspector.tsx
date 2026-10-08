import React, { useState } from 'react';
import { ServiceNode, EdgeDependency } from '../types/telemetry';
import { Activity, Server, Cpu, HardDrive, RefreshCw, BarChart2 } from 'lucide-react';
import { ColorTheme, THEMES } from '../types/theme';

interface TemporalMetricsInspectorProps {
  selectedNode: ServiceNode | null;
  edges: EdgeDependency[];
  onSelectNode: (nodeId: string) => void;
  theme?: ColorTheme;
}

export const TemporalMetricsInspector: React.FC<TemporalMetricsInspectorProps> = ({
  selectedNode,
  edges,
  onSelectNode,
  theme = 'violet',
}) => {
  const [viewMode, setViewMode] = useState<'raw' | 'normalized'>('raw');
  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;

  if (!selectedNode) {
    return (
      <div
        className={`w-full h-80 rounded-2xl border p-8 flex flex-col items-center justify-center text-center transition-colors ${
          isDark
            ? 'border-slate-800 bg-slate-900/40 text-slate-300'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm'
        }`}
      >
        <Server className="w-8 h-8 text-slate-400 mb-2" />
        <h4 className="text-sm font-semibold">No Service Selected</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Click any microservice node in the topology canvas to inspect its 20-tick multivariate temporal feature window and GNN tensor embeddings.
        </p>
      </div>
    );
  }

  const incomingEdges = edges.filter((e) => e.target === selectedNode.id);
  const outgoingEdges = edges.filter((e) => e.source === selectedNode.id);

  const history = selectedNode.history || [];
  const normalized = selectedNode.normalizedFeatures || [];

  const getMinMax = (vals: number[]) => {
    if (vals.length === 0) return { min: 0, max: 1 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    return { min, max: max === min ? max + 1 : max };
  };

  const latencies = history.map((h) => h.latencyMs);
  const errorRates = history.map((h) => h.errorRate * 100);
  const requestRates = history.map((h) => h.requestRate);
  const cpuLoads = history.map((h) => h.cpuPct);
  const memLoads = history.map((h) => h.memPct);

  // Render SVG Sparkline with smooth curve and fill
  const renderSparkline = (values: number[], strokeColor: string, unit: string, isError = false) => {
    const { min, max } = getMinMax(values);
    const width = 280;
    const height = 52;
    const padding = 5;

    const points = values.map((val, idx) => {
      const x = padding + (idx / Math.max(1, values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / (max - min)) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const currentVal = values[values.length - 1] ?? 0;

    return (
      <div
        className={`flex flex-col gap-1.5 p-3.5 rounded-xl border transition-all duration-200 hover:scale-102 ${
          isDark
            ? 'bg-slate-950/70 border-slate-800/80 shadow-xs'
            : 'bg-slate-50 border-slate-200 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <span className={isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>
            Current:
          </span>
          <span
            className={`font-mono font-bold ${
              isError && currentVal > 5
                ? 'text-rose-500'
                : isDark
                ? 'text-white'
                : 'text-slate-900'
            }`}
          >
            {currentVal.toFixed(1)} {unit}
          </span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-13 overflow-visible">
          <line
            x1="0"
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke={isDark ? '#1e293b' : '#e2e8f0'}
            strokeDasharray="3,3"
          />
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            className="transition-all duration-300"
          />
        </svg>
        <div
          className={`flex items-center justify-between text-[10px] font-mono ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <span>t-20</span>
          <span>min: {min.toFixed(0)}</span>
          <span>max: {max.toFixed(0)}</span>
          <span>now</span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-full flex flex-col gap-5 rounded-2xl border p-5 sm:p-6 transition-colors duration-200 shadow-xl ${
        isDark
          ? 'bg-slate-950 border-slate-800/80 text-white shadow-black/30'
          : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-200/50'
      }`}
    >
      {/* Node Header */}
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
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">{selectedNode.name}</h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md font-mono border ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {selectedNode.tier}
              </span>
              <span
                className={`text-xs font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {selectedNode.version}
              </span>
            </div>
            <p
              className={`text-xs font-mono mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Host: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{selectedNode.host}</span>
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1 p-1 rounded-xl border text-xs transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-lg transition-all font-medium ${
                viewMode === 'raw'
                  ? isDark
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'bg-white text-slate-900 font-semibold shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw Telemetry
            </button>
            <button
              onClick={() => setViewMode('normalized')}
              className={`px-3 py-1 rounded-lg transition-all font-medium ${
                viewMode === 'normalized'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Z-Score Tensor (X_i)
            </button>
          </div>

          {/* Anomaly Gauge */}
          <div
            className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs transition-colors ${
              isDark
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              GNN Score:
            </span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-md border ${
                selectedNode.anomalyScore >= 0.75
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-500'
                  : selectedNode.anomalyScore >= 0.4
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
              }`}
            >
              {(selectedNode.anomalyScore * 100).toFixed(1)}% (&tau; = {selectedNode.anomalyScore.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {viewMode === 'raw' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div>
            <span className={`text-xs font-semibold block mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Activity className="w-3.5 h-3.5 text-sky-500" /> Latency
            </span>
            {renderSparkline(latencies, '#0284c7', 'ms')}
          </div>
          <div>
            <span className={`text-xs font-semibold block mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <BarChart2 className="w-3.5 h-3.5 text-rose-500" /> Error Rate
            </span>
            {renderSparkline(errorRates, '#e11d48', '%', true)}
          </div>
          <div>
            <span className={`text-xs font-semibold block mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> Throughput
            </span>
            {renderSparkline(requestRates, '#6366f1', 'RPS')}
          </div>
          <div>
            <span className={`text-xs font-semibold block mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Cpu className="w-3.5 h-3.5 text-amber-500" /> CPU Load
            </span>
            {renderSparkline(cpuLoads, '#d97706', '%')}
          </div>
          <div>
            <span className={`text-xs font-semibold block mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" /> Memory Load
            </span>
            {renderSparkline(memLoads, '#059669', '%')}
          </div>
        </div>
      ) : (
        <div
          className={`flex flex-col gap-2 p-4 rounded-xl border transition-colors ${
            isDark
              ? 'bg-slate-900/60 border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">
              Input Tensor Matrix: <span className="font-mono text-indigo-500">X_i &isin; R^[20 &times; 5]</span>
            </span>
            <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Normalized via &mu; and &sigma; across sliding 20-tick history
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className={`border-b text-[11px] ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="py-1 px-2 text-left">t (Step)</th>
                  <th className="py-1 px-2 text-right">f0: Latency</th>
                  <th className="py-1 px-2 text-right">f1: Error %</th>
                  <th className="py-1 px-2 text-right">f2: RPS</th>
                  <th className="py-1 px-2 text-right">f3: CPU %</th>
                  <th className="py-1 px-2 text-right">f4: Mem %</th>
                </tr>
              </thead>
              <tbody>
                {normalized.slice(-10).map((row, idx) => {
                  const stepIndex = normalized.length - 10 + idx - 20;
                  return (
                    <tr
                      key={idx}
                      className={`border-b transition-colors ${
                        isDark
                          ? 'border-slate-900 hover:bg-slate-800/40'
                          : 'border-slate-200/60 hover:bg-white'
                      }`}
                    >
                      <td className={`py-1 px-2 text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        t{stepIndex}
                      </td>
                      {row.map((val, fIdx) => {
                        const isHigh = Math.abs(val) > 1.8;
                        return (
                          <td
                            key={fIdx}
                            className={`py-1 px-2 text-right font-medium ${
                              isHigh
                                ? 'text-rose-500 font-bold'
                                : val > 0.5
                                ? 'text-amber-500'
                                : isDark
                                ? 'text-slate-400'
                                : 'text-slate-600'
                            }`}
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Call Graph Dependencies */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t transition-colors ${
          isDark ? 'border-slate-800/80' : 'border-slate-200'
        }`}
      >
        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className={`text-xs font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Upstream Callers ({incomingEdges.length})
          </span>
          {incomingEdges.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No incoming callers (Edge Ingress Gateway)</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {incomingEdges.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onSelectNode(e.source)}
                  className={`flex items-center justify-between text-xs p-2.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                  }`}
                >
                  <span className="font-mono text-indigo-500 font-bold">{e.source}</span>
                  <div className="flex items-center gap-3 text-[11px] font-mono opacity-80">
                    <span>{e.callType}</span>
                    <span>{e.meanLatency}ms</span>
                    <span>{e.rps} RPS</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`p-3.5 rounded-xl border transition-colors ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className={`text-xs font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Downstream Dependencies ({outgoingEdges.length})
          </span>
          {outgoingEdges.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No downstream dependencies (Leaf Storage / Cache)</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {outgoingEdges.map((e) => (
                <div
                  key={e.id}
                  onClick={() => onSelectNode(e.target)}
                  className={`flex items-center justify-between text-xs p-2.5 rounded-lg border cursor-pointer transition-all hover:scale-[1.01] ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-2xs'
                  }`}
                >
                  <span className="font-mono text-indigo-500 font-bold">{e.target}</span>
                  <div className="flex items-center gap-3 text-[11px] font-mono opacity-80">
                    <span>{e.callType}</span>
                    <span>{e.meanLatency}ms</span>
                    <span>{e.rps} RPS</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
