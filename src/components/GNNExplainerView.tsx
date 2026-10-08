import React from 'react';
import { RCAReport } from '../types/telemetry';
import { ShieldAlert, ArrowRight, Zap, Target, BookOpen } from 'lucide-react';
import { ColorTheme, THEMES } from '../types/theme';

interface GNNExplainerViewProps {
  rca: RCAReport | null;
  onSelectNode?: (nodeId: string) => void;
  theme?: ColorTheme;
}

export const GNNExplainerView: React.FC<GNNExplainerViewProps> = ({ rca, onSelectNode, theme = 'violet' }) => {
  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;

  if (!rca) {
    return (
      <div
        className={`w-full rounded-2xl border p-8 flex flex-col items-center justify-center text-center transition-colors ${
          isDark
            ? 'border-slate-800 bg-slate-900/40 text-slate-300'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm'
        }`}
      >
        <ShieldAlert className="w-8 h-8 text-slate-400 mb-2" />
        <h4 className="text-sm font-semibold">GNNExplainer Idle</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md">
          No anomaly currently active (&tau; &lt; 0.75). When an anomaly occurs or when you inject a synthetic fault, GNNExplainer will automatically optimize continuous edge masks <span className="font-mono text-indigo-500">M_e</span> to pinpoint the physical root cause and trace causal propagation paths.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`w-full flex flex-col gap-6 rounded-2xl border p-6 transition-colors duration-200 shadow-xl ${
        isDark
          ? 'bg-slate-950 border-rose-900/40 text-white shadow-black/30'
          : 'bg-white border-rose-200 text-slate-900 shadow-slate-200/50'
      }`}
    >
      {/* Top Banner */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 border-b pb-4 transition-colors ${
          isDark ? 'border-rose-900/40' : 'border-rose-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isDark
                ? 'bg-rose-950/80 border border-rose-700/60 text-rose-400'
                : 'bg-rose-50 border border-rose-200 text-rose-600 shadow-xs'
            }`}
          >
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight">
                GNNExplainer Root Cause Analysis
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md font-mono border ${
                  isDark
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}
              >
                Confidence: {(rca.rootCauseConfidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Incident ID: <span className="font-bold">{rca.incidentId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Isolated Cause:</span>
          <span className="bg-rose-600 text-white font-bold px-3 py-1 rounded-lg shadow-xs">
            {rca.rootCauseCandidate}
          </span>
        </div>
      </div>

      {/* Causal Cascade Timeline */}
      <div
        className={`flex flex-col gap-2 p-4 rounded-xl border transition-colors ${
          isDark
            ? 'bg-slate-900/60 border-slate-800'
            : 'bg-rose-50/40 border-rose-100'
        }`}
      >
        <span className="text-xs font-semibold">
          Causal Propagation Cascade: Physical Culprit &rarr; Symptomatic Victims
        </span>
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {rca.propagationPath.map((nodeName, idx) => {
            const isRoot = nodeName === rca.rootCauseCandidate;
            const isTarget = nodeName === rca.targetNode;

            return (
              <React.Fragment key={nodeName}>
                <div
                  onClick={() => onSelectNode?.(nodeName)}
                  className={`cursor-pointer px-3 py-2 rounded-xl border transition-all text-xs font-mono flex flex-col items-center min-w-[120px] hover:scale-102 ${
                    isRoot
                      ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20'
                      : isTarget
                      ? isDark
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-amber-50 border-amber-300 text-amber-800'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 shadow-2xs'
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-wider mb-0.5 ${isRoot ? 'text-rose-100' : 'opacity-70'}`}>
                    {isRoot ? '1. Physical Root' : isTarget ? 'Symptom Entry' : `Step ${idx + 1}`}
                  </span>
                  <span className="font-bold">{nodeName}</span>
                </div>

                {idx < rca.propagationPath.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {rca.explanationSummary}
        </p>
      </div>

      {/* Edge Attributions Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Edge Importance Attribution Mask (M_e)
          </h4>
          <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Optimized via Mutual Information MI(Y, G_S)
          </span>
        </div>

        <div
          className={`overflow-x-auto rounded-xl border transition-colors ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <table className="w-full text-xs font-mono">
            <thead>
              <tr
                className={`border-b text-[11px] ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <th className="py-2.5 px-3 text-left">Caller (Source)</th>
                <th className="py-2.5 px-3 text-left">Callee (Target)</th>
                <th className="py-2.5 px-3 text-right">Edge Latency</th>
                <th className="py-2.5 px-3 text-right">Error Rate</th>
                <th className="py-2.5 px-3 text-left w-48">Attribution Weight (M_e)</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark ? 'divide-slate-900' : 'divide-slate-200/60'
              }`}
            >
              {rca.edgeAttributions.map((ea, idx) => (
                <tr
                  key={idx}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2 px-3 font-semibold">{ea.source}</td>
                  <td className="py-2 px-3 font-semibold">{ea.target}</td>
                  <td className={`py-2 px-3 text-right ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ea.latencyMs} ms</td>
                  <td className={`py-2 px-3 text-right ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{(ea.errorRate * 100).toFixed(1)}%</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex-1 h-2 rounded-full overflow-hidden ${
                          isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`}
                      >
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-rose-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, ea.importance * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-rose-500 w-10 text-right">
                        {(ea.importance * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mathematical Architecture Primer */}
      <div
        className={`p-4 rounded-xl border text-xs flex flex-col gap-2 transition-colors ${
          isDark
            ? 'bg-slate-900/50 border-slate-800/80 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 text-indigo-600 font-semibold">
          <BookOpen className="w-4 h-4" />
          <span>Spatial-Temporal GNN Mathematical Formulation</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1 font-mono text-[11px]">
          <div
            className={`p-3 rounded-lg border ${
              isDark
                ? 'bg-slate-950 border-slate-800/60 text-slate-400'
                : 'bg-white border-slate-200 text-slate-600 shadow-2xs'
            }`}
          >
            <span className={`font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              1. Temporal GRU Formulation
            </span>
            <code className="text-indigo-500">h_i^(0) = GRU(X_i)_t=T &isin; R^64</code>
            <p className="mt-1 text-[10px] opacity-75">
              Aggregates sliding T=20 window of multivariate metrics: [latency, error_rate, rps, cpu, mem].
            </p>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              isDark
                ? 'bg-slate-950 border-slate-800/60 text-slate-400'
                : 'bg-white border-slate-200 text-slate-600 shadow-2xs'
            }`}
          >
            <span className={`font-semibold block mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              2. Multi-Head GATv2 Attention with Edge Features
            </span>
            <code className="text-indigo-500">&alpha;_ij^(k) = softmax_j(a_k^T LeakyReLU(W_s h_i + W_t h_j + W_e e_ij))</code>
            <p className="mt-1 text-[10px] opacity-75">
              Computes caller-callee dynamic attention incorporating latency &amp; throughput edge attributes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
