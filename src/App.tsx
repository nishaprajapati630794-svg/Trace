/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { telemetrySimulator } from './engine/telemetrySimulator';
import { TelemetrySnapshot, FaultType } from './types/telemetry';
import { ColorTheme, THEMES } from './types/theme';
import { Header } from './components/Header';
import { TopologyGraph } from './components/TopologyGraph';
import { TemporalMetricsInspector } from './components/TemporalMetricsInspector';
import { GNNExplainerView } from './components/GNNExplainerView';
import { TraceWaterfallView } from './components/TraceWaterfallView';
import { IncidentsManager } from './components/IncidentsManager';
import { FaultInjectorModal } from './components/FaultInjectorModal';
import { Activity, ShieldAlert, Cpu, Zap } from 'lucide-react';

export default function App() {
  const [snapshot, setSnapshot] = useState<TelemetrySnapshot>(() => telemetrySimulator.tick());
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [tickRateMs, setTickRateMs] = useState<number>(1000);
  const [activeTab, setActiveTab] = useState<'topology' | 'metrics' | 'traces' | 'incidents'>('topology');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('db-cluster');
  const [isFaultModalOpen, setIsFaultModalOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<ColorTheme>('light');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;

  // Periodic Telemetry Simulator Tick Loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        const nextSnapshot = telemetrySimulator.tick();
        setSnapshot(nextSnapshot);

        if (nextSnapshot.anomalyDetected && nextSnapshot.currentRCA) {
          const rootNode = nextSnapshot.currentRCA.rootCauseCandidate;
          if (rootNode) {
            setSelectedNodeId(rootNode);
          }
        }
      }, tickRateMs);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, tickRateMs]);

  const handleToggleRunning = () => {
    setIsRunning((prev) => !prev);
  };

  const handleTriggerFault = (
    faultType: FaultType,
    targetService: string,
    durationTicks: number,
    magnitude: number
  ) => {
    telemetrySimulator.triggerFault(faultType, targetService, durationTicks, magnitude);
    const updated = telemetrySimulator.tick();
    setSnapshot(updated);
    setSelectedNodeId(targetService);
    setIsFaultModalOpen(false);
  };

  const handleClearFault = (faultId: string) => {
    telemetrySimulator.clearFault(faultId);
    setSnapshot(telemetrySimulator.tick());
  };

  const handleClearAllFaults = () => {
    telemetrySimulator.clearAllFaults();
    setSnapshot(telemetrySimulator.tick());
  };

  const handleResolveIncident = (id: string) => {
    telemetrySimulator.resolveIncident(id);
    setSnapshot({ ...snapshot });
  };

  const selectedNode = snapshot.nodes.find((n) => n.id === selectedNodeId) || snapshot.nodes[0] || null;

  // Aggregate stats
  const totalRps = snapshot.nodes.reduce((sum, n) => sum + n.currentMetrics.requestRate, 0);
  const avgLatency = Math.round(
    snapshot.nodes.reduce((sum, n) => sum + n.currentMetrics.latencyMs, 0) / (snapshot.nodes.length || 1)
  );
  const criticalCount = snapshot.nodes.filter((n) => n.anomalyScore >= 0.75).length;
  const unresolvedIncidentsCount = telemetrySimulator.getPersistedIncidents().filter((i) => !i.resolved).length;

  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans transition-colors duration-300 selection:bg-indigo-500/20 selection:text-indigo-900 ${
        isDark ? `${currentTheme.bgCanvas} text-slate-100` : `${currentTheme.bgCanvas} text-slate-900`
      }`}
    >
      {/* Ambient background glowing orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {isDark ? (
          <>
            <div
              className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
              style={{ backgroundColor: currentTheme.accent }}
            />
            <div className="absolute top-1/3 -right-32 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[140px] opacity-20" />
            <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[160px] opacity-15" />
          </>
        ) : (
          <>
            <div className="absolute -top-32 left-1/4 w-[520px] h-[520px] rounded-full blur-[140px] bg-indigo-200/60 opacity-70" />
            <div className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full blur-[140px] bg-sky-200/50 opacity-60" />
            <div className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] rounded-full blur-[160px] bg-purple-200/40 opacity-50" />
          </>
        )}
      </div>

      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isRunning={isRunning}
        onToggleRunning={handleToggleRunning}
        tickRateMs={tickRateMs}
        onChangeTickRate={setTickRateMs}
        onOpenFaultModal={() => setIsFaultModalOpen(true)}
        activeFaults={snapshot.activeFaults}
        onClearFaults={handleClearAllFaults}
        anomalyDetected={snapshot.anomalyDetected}
        currentTick={snapshot.tick}
        theme={theme}
        onChangeTheme={setTheme}
      />

      {/* Main Workspace Body */}
      <main className="relative z-10 flex-1 w-full max-w-[1600px] mx-auto px-4 lg:px-8 py-5 flex flex-col gap-5">
        {/* Metric Ribbons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            className={`rounded-2xl p-4 border flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
              isDark
                ? 'bg-white/5 border-white/10 backdrop-blur-xl shadow-black/20'
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Cluster Nodes
            </span>
            <span className="text-2xl font-extrabold font-mono mt-0.5 tracking-tight">
              {snapshot.nodes.length} <span className="text-xs font-normal opacity-70">services</span>
            </span>
          </div>

          <div
            className={`rounded-2xl p-4 border flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
              isDark
                ? 'bg-white/5 border-white/10 backdrop-blur-xl shadow-black/20'
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Ingress Traffic
            </span>
            <span className="text-2xl font-extrabold font-mono mt-0.5 text-cyan-400 tracking-tight">
              {totalRps.toLocaleString()} <span className="text-xs font-normal text-slate-400">RPS</span>
            </span>
          </div>

          <div
            className={`rounded-2xl p-4 border flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
              isDark
                ? 'bg-white/5 border-white/10 backdrop-blur-xl shadow-black/20'
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Cluster Latency
            </span>
            <span
              className={`text-2xl font-extrabold font-mono mt-0.5 tracking-tight ${
                avgLatency > 120 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {avgLatency} <span className="text-xs font-normal text-slate-400">ms</span>
            </span>
          </div>

          <div
            className={`rounded-2xl p-4 border flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
              isDark
                ? 'bg-white/5 border-white/10 backdrop-blur-xl shadow-black/20'
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              GNN Threshold
            </span>
            <span className="text-2xl font-extrabold text-violet-400 font-mono mt-0.5 tracking-tight">
              &tau; &ge; 0.75
            </span>
          </div>

          <div
            className={`rounded-2xl p-4 border flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
              isDark
                ? 'bg-white/5 border-white/10 backdrop-blur-xl shadow-black/20'
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Anomalies Flagged
            </span>
            <span
              className={`text-2xl font-extrabold font-mono mt-0.5 tracking-tight ${
                criticalCount > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {criticalCount} <span className="text-xs font-normal text-slate-400">nodes</span>
            </span>
          </div>

          <div
            className={`rounded-2xl p-4 border flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
              isDark
                ? 'bg-white/5 border-white/10 backdrop-blur-xl shadow-black/20'
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Incidents
            </span>
            <span
              className={`text-2xl font-extrabold font-mono mt-0.5 tracking-tight ${
                unresolvedIncidentsCount > 0 ? 'text-rose-400 font-bold' : isDark ? 'text-slate-300' : 'text-slate-800'
              }`}
            >
              {unresolvedIncidentsCount} <span className="text-xs font-normal text-slate-400">active</span>
            </span>
          </div>
        </div>

        {/* Dynamic Tab Views */}
        {activeTab === 'topology' && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <TopologyGraph
              nodes={snapshot.nodes}
              edges={snapshot.edges}
              rca={snapshot.currentRCA}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              theme={theme}
            />

            {/* Split bottom view */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <GNNExplainerView rca={snapshot.currentRCA} onSelectNode={setSelectedNodeId} theme={theme} />
              <TemporalMetricsInspector
                selectedNode={selectedNode}
                edges={snapshot.edges}
                onSelectNode={setSelectedNodeId}
                theme={theme}
              />
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className={`text-xs font-semibold shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Switch Node:
              </span>
              {snapshot.nodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all shrink-0 cursor-pointer ${
                    selectedNodeId === node.id
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-md shadow-violet-500/25 scale-105 ring-1 ring-white/20'
                      : node.anomalyScore >= 0.75
                      ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400 font-bold'
                      : isDark
                      ? 'bg-white/5 text-slate-300 hover:text-white border border-white/10 hover:bg-white/10'
                      : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs'
                  }`}
                >
                  {node.name}
                </button>
              ))}
            </div>

            <TemporalMetricsInspector
              selectedNode={selectedNode}
              edges={snapshot.edges}
              onSelectNode={setSelectedNodeId}
              theme={theme}
            />

            <GNNExplainerView rca={snapshot.currentRCA} onSelectNode={setSelectedNodeId} theme={theme} />
          </div>
        )}

        {activeTab === 'traces' && (
          <div className="animate-in fade-in duration-300">
            <TraceWaterfallView traces={snapshot.traces} theme={theme} />
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="animate-in fade-in duration-300">
            <IncidentsManager
              incidents={telemetrySimulator.getPersistedIncidents()}
              onResolveIncident={handleResolveIncident}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setActiveTab('topology');
              }}
              theme={theme}
            />
          </div>
        )}
      </main>

      {/* Fault Injection Modal */}
      <FaultInjectorModal
        isOpen={isFaultModalOpen}
        onClose={() => setIsFaultModalOpen(false)}
        nodes={snapshot.nodes}
        activeFaults={snapshot.activeFaults}
        onTriggerFault={handleTriggerFault}
        onClearFault={handleClearFault}
        onClearAllFaults={handleClearAllFaults}
        theme={theme}
      />
    </div>
  );
}
