import React, { useMemo, useState } from 'react';
import {
  ServiceNode,
  EdgeDependency,
  RCAReport,
  ServiceTier,
} from '../types/telemetry';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { ColorTheme, THEMES } from '../types/theme';

interface TopologyGraphProps {
  nodes: ServiceNode[];
  edges: EdgeDependency[];
  rca: RCAReport | null;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  theme?: ColorTheme;
}

const NODE_COORDINATES: Record<string, { x: number; y: number }> = {
  'api-gateway': { x: 120, y: 280 },
  'auth-service': { x: 340, y: 130 },
  'user-profile': { x: 340, y: 430 },
  'checkout-service': { x: 340, y: 280 },
  'inventory-service': { x: 570, y: 190 },
  'order-service': { x: 570, y: 320 },
  'redis-cache': { x: 570, y: 470 },
  'payment-service': { x: 790, y: 260 },
  'kafka-broker': { x: 790, y: 390 },
  'external-stripe-gw': { x: 1020, y: 190 },
  'db-cluster': { x: 1020, y: 310 },
  'notification-service': { x: 1020, y: 430 },
};

const TIER_COLORS: Record<ServiceTier, { dot: string; glow: string; text: string; border: string }> = {
  edge: { dot: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', text: 'text-cyan-400', border: '#0891b2' },
  core: { dot: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', text: 'text-indigo-400', border: '#4f46e5' },
  business: { dot: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.4)', text: 'text-violet-400', border: '#7c3aed' },
  data: { dot: '#d946ef', glow: 'rgba(217, 70, 239, 0.4)', text: 'text-fuchsia-400', border: '#c026d3' },
  cache: { dot: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: 'text-emerald-400', border: '#059669' },
  messaging: { dot: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-400', border: '#d97706' },
  external: { dot: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)', text: 'text-rose-400', border: '#e11d48' },
};

export const TopologyGraph: React.FC<TopologyGraphProps> = ({
  nodes,
  edges,
  rca,
  selectedNodeId,
  onSelectNode,
  theme = 'violet',
}) => {
  const [tierFilter, setTierFilter] = useState<ServiceTier | 'all'>('all');
  const [showAttributionsOnly, setShowAttributionsOnly] = useState<boolean>(false);

  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;

  const filteredNodes = useMemo(() => {
    if (tierFilter === 'all') return nodes;
    return nodes.filter((n) => n.tier === tierFilter);
  }, [nodes, tierFilter]);

  return (
    <div
      className={`relative w-full h-full flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden shadow-2xl backdrop-blur-xl ${
        isDark
          ? 'bg-[#0a0d1b]/95 border-white/10 text-white shadow-black/60 ring-1 ring-white/5'
          : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-200/60'
      }`}
    >
      {/* Top Filter Bar */}
      <div
        className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
          isDark
            ? 'border-white/10 bg-white/5 backdrop-blur-md'
            : 'border-slate-200/80 bg-slate-50/80'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Service Tiers:
          </span>
          <div
            className={`flex items-center gap-1 p-1 rounded-xl border ${
              isDark
                ? 'bg-black/30 border-white/10'
                : 'bg-white border-slate-200 shadow-2xs'
            }`}
          >
            {(['all', 'edge', 'business', 'data', 'cache', 'messaging', 'external'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-2.5 py-1 rounded-lg text-[11px] capitalize transition-all font-semibold cursor-pointer ${
                  tierFilter === tier
                    ? isDark
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* RCA Edge attribution toggle */}
        <div className="flex items-center gap-4">
          {rca && (
            <button
              onClick={() => setShowAttributionsOnly(!showAttributionsOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-105 active:scale-95 ${
                showAttributionsOnly
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white border-rose-400 shadow-rose-500/30'
                  : isDark
                  ? 'bg-white/5 border-white/15 text-slate-200 hover:bg-white/10'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{showAttributionsOnly ? 'Show All Edges' : 'Isolate Causal Path'}</span>
            </button>
          )}

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-xs shadow-emerald-400/50 animate-pulse" /> Nominal
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-xs shadow-amber-400/50" /> Warning
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs shadow-rose-500/50 animate-ping" /> Critical (&ge;0.75)
            </span>
          </div>
        </div>
      </div>

      {/* Main SVG/Canvas Diagram Viewport with ambient grid */}
      <div
        className={`relative flex-1 w-full min-h-[580px] overflow-auto transition-colors ${
          isDark
            ? 'bg-[radial-gradient(#2d3748_1px,transparent_1px)] [background-size:24px_24px] bg-[#070914]'
            : 'bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] [background-size:24px_24px] bg-slate-50/70'
        }`}
      >
        <svg
          viewBox="0 0 1180 580"
          className="w-full h-full min-w-[1020px] min-h-[560px]"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Arrow markers */}
            <marker
              id="arrow-normal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill={isDark ? '#64748b' : '#94a3b8'} />
            </marker>

            <marker
              id="arrow-anomalous"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
            </marker>

            <marker
              id="arrow-causal"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
            </marker>

            {/* Glowing filter */}
            <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Directed Edges */}
          {edges.map((edge, edgeIdx) => {
            const srcPos = NODE_COORDINATES[edge.source];
            const tgtPos = NODE_COORDINATES[edge.target];
            if (!srcPos || !tgtPos) return null;

            const isCausal = edge.isCausalPath;
            const isAnomalous = edge.isAnomalous;

            if (showAttributionsOnly && !isCausal) {
              return null;
            }

            // Curve calculation
            const dx = tgtPos.x - srcPos.x;
            const dy = tgtPos.y - srcPos.y;
            const midX = (srcPos.x + tgtPos.x) / 2;
            const midY = (srcPos.y + tgtPos.y) / 2 + (dx > 0 ? (dy > 0 ? 14 : -14) : 0);

            const pathD = `M ${srcPos.x} ${srcPos.y} Q ${midX} ${midY} ${tgtPos.x} ${tgtPos.y}`;

            const strokeColor = isCausal
              ? '#f43f5e'
              : isAnomalous
              ? '#f59e0b'
              : isDark
              ? 'rgba(148, 163, 184, 0.35)'
              : 'rgba(148, 163, 184, 0.6)';

            const strokeWidth = isCausal ? 3.5 : isAnomalous ? 2.5 : 1.6;
            const duration = isCausal ? '1.1s' : `${Math.max(1.6, Math.min(3.8, edge.meanLatency / 70))}s`;

            return (
              <g key={edge.id} className="transition-all duration-300">
                {/* Glowing under-stroke for causal path */}
                {isCausal && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="10"
                    strokeOpacity="0.4"
                    strokeLinecap="round"
                    filter="url(#neon-glow)"
                  />
                )}

                {/* Primary Edge Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isCausal ? '8,4' : isAnomalous ? '6,3' : '4,4'}
                  className={isCausal ? 'animate-flow-dash-fast' : 'animate-flow-dash'}
                  markerEnd={
                    isCausal
                      ? 'url(#arrow-causal)'
                      : isAnomalous
                      ? 'url(#arrow-anomalous)'
                      : 'url(#arrow-normal)'
                  }
                />

                {/* Animated Glowing Packet */}
                <circle
                  r={isCausal ? '5' : '3.5'}
                  fill={isCausal ? '#fb7185' : isAnomalous ? '#fbbf24' : isDark ? '#38bdf8' : '#4f46e5'}
                  filter={isCausal ? 'url(#neon-glow)' : undefined}
                >
                  <animateMotion
                    dur={duration}
                    repeatCount="indefinite"
                    path={pathD}
                    begin={`${(edgeIdx * 0.25) % 2.5}s`}
                  />
                </circle>

                {/* Attribution weight badge on edge */}
                {edge.attributionWeight !== undefined && edge.attributionWeight > 0.35 && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-25"
                      y="-12"
                      width="50"
                      height="22"
                      rx="7"
                      fill={isDark ? '#0b0f19' : '#ffffff'}
                      stroke="#f43f5e"
                      strokeWidth="1.6"
                      className="shadow-md"
                    />
                    <text
                      x="0"
                      y="4"
                      fill="#f43f5e"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {(edge.attributionWeight * 100).toFixed(0)}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Node Renderings */}
          {filteredNodes.map((node) => {
            const pos = NODE_COORDINATES[node.id];
            if (!pos) return null;

            const isSelected = selectedNodeId === node.id;
            const isRoot = node.isRootCause;
            const inCascade = node.isInCascadePath;
            const score = node.anomalyScore;
            const tierStyle = TIER_COLORS[node.tier] || TIER_COLORS.business;

            const cardWidth = 168;
            const cardHeight = 78;
            const x = pos.x - cardWidth / 2;
            const y = pos.y - cardHeight / 2;

            return (
              <g
                key={node.id}
                transform={`translate(${x}, ${y})`}
                onClick={() => onSelectNode(node.id)}
                className="cursor-pointer select-none group"
              >
                {/* Root Cause pulsing beacon ring */}
                {isRoot && (
                  <rect
                    x="-10"
                    y="-10"
                    width={cardWidth + 20}
                    height={cardHeight + 20}
                    rx="22"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="3"
                    strokeOpacity="0.8"
                    className="animate-ping"
                  />
                )}

                {/* Soft ambient glow behind node */}
                <rect
                  x="-2"
                  y="-2"
                  width={cardWidth + 4}
                  height={cardHeight + 4}
                  rx="18"
                  fill="none"
                  stroke={isRoot ? '#f43f5e' : isSelected ? '#8b5cf6' : tierStyle.dot}
                  strokeWidth="2"
                  strokeOpacity={isRoot ? '0.7' : isSelected ? '0.6' : '0.2'}
                  filter={isRoot || isSelected ? 'url(#neon-glow)' : undefined}
                />

                {/* Node Box Frame */}
                <rect
                  x="0"
                  y="0"
                  width={cardWidth}
                  height={cardHeight}
                  rx="16"
                  fill={
                    isDark
                      ? isSelected
                        ? '#14182b'
                        : '#0d1122'
                      : isSelected
                      ? '#f8fafc'
                      : '#ffffff'
                  }
                  stroke={
                    isRoot
                      ? '#f43f5e'
                      : inCascade
                      ? '#fb7185'
                      : isSelected
                      ? '#8b5cf6'
                      : score >= 0.75
                      ? '#f43f5e'
                      : score >= 0.4
                      ? '#f59e0b'
                      : isDark
                      ? 'rgba(255,255,255,0.1)'
                      : '#e2e8f0'
                  }
                  strokeWidth={isRoot || isSelected ? 2.5 : 1.5}
                  className="transition-all duration-200 group-hover:scale-102"
                />

                {/* Decorative colored top accent strip inside card */}
                <rect
                  x="12"
                  y="0"
                  width={cardWidth - 24}
                  height="3"
                  rx="1.5"
                  fill={isRoot ? '#f43f5e' : tierStyle.dot}
                  fillOpacity="0.9"
                />

                {/* Header row inside node card */}
                <g transform="translate(12, 22)">
                  <circle cx="5" cy="-2" r="5" fill={tierStyle.dot} />
                  <text
                    x="18"
                    y="2"
                    fill={isDark ? '#f8fafc' : '#0f172a'}
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {node.name.length > 15 ? `${node.name.slice(0, 14)}…` : node.name}
                  </text>
                </g>

                {/* Metrics Row 1: Latency & RPS */}
                <g transform="translate(12, 45)">
                  <text
                    x="0"
                    y="0"
                    fill={isDark ? '#94a3b8' : '#64748b'}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Lat: <tspan fill={node.currentMetrics.latencyMs > 250 ? '#f43f5e' : isDark ? '#ffffff' : '#0f172a'} fontWeight="bold">{node.currentMetrics.latencyMs}ms</tspan>
                  </text>
                  <text
                    x="86"
                    y="0"
                    fill={isDark ? '#94a3b8' : '#64748b'}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    RPS: <tspan fill={isDark ? '#ffffff' : '#0f172a'} fontWeight="bold">{node.currentMetrics.requestRate}</tspan>
                  </text>
                </g>

                {/* Metrics Row 2: Error Rate & Score Gauge */}
                <g transform="translate(12, 62)">
                  <text
                    x="0"
                    y="0"
                    fill={isDark ? '#94a3b8' : '#64748b'}
                    fontSize="10"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Err: <tspan fill={node.currentMetrics.errorRate > 0.03 ? '#f43f5e' : isDark ? '#ffffff' : '#0f172a'} fontWeight="bold">{(node.currentMetrics.errorRate * 100).toFixed(1)}%</tspan>
                  </text>

                  {/* Anomaly Score gauge */}
                  <g transform="translate(86, -9)">
                    <rect
                      x="0"
                      y="0"
                      width="60"
                      height="13"
                      rx="4"
                      fill={isDark ? '#1e293b' : '#e2e8f0'}
                    />
                    <rect
                      x="0"
                      y="0"
                      width={Math.min(60, Math.max(5, score * 60))}
                      height="13"
                      rx="4"
                      fill={score >= 0.75 ? '#f43f5e' : score >= 0.4 ? '#f59e0b' : '#10b981'}
                      className="transition-all duration-300"
                    />
                    <text
                      x="30"
                      y="9.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="8.5"
                      fontWeight="bold"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      &tau; {score.toFixed(2)}
                    </text>
                  </g>
                </g>

                {/* Badges for Root Cause / Cascade */}
                {isRoot && (
                  <g transform={`translate(${cardWidth - 76}, -10)`}>
                    <rect
                      x="0"
                      y="0"
                      width="80"
                      height="18"
                      rx="6"
                      fill="#f43f5e"
                      className="shadow-md"
                    />
                    <text
                      x="40"
                      y="13"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="800"
                      textAnchor="middle"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      ROOT CAUSE
                    </text>
                  </g>
                )}

                {!isRoot && inCascade && (
                  <g transform={`translate(${cardWidth - 70}, -10)`}>
                    <rect
                      x="0"
                      y="0"
                      width="74"
                      height="18"
                      rx="6"
                      fill="#fb7185"
                      className="shadow-md"
                    />
                    <text
                      x="37"
                      y="13"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="800"
                      textAnchor="middle"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      CASCADE
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Causal Cascade Banner if anomaly active */}
      {rca && (
        <div
          className={`px-5 py-3.5 border-t flex flex-wrap items-center justify-between gap-4 text-xs transition-colors ${
            isDark
              ? 'border-rose-500/30 bg-rose-950/50 backdrop-blur-md'
              : 'border-rose-200 bg-rose-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-xs">
              <ShieldAlert className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-rose-500 tracking-tight">
                  PHYSICAL ROOT CAUSE ISOLATED:
                </span>
                <span className="font-mono font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 px-3 py-0.5 rounded-lg text-xs shadow-md shadow-rose-600/30">
                  {rca.rootCauseCandidate}
                </span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>·</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                  Confidence: <span className="text-rose-400 font-mono font-bold">{(rca.rootCauseConfidence * 100).toFixed(0)}%</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-1.5 flex-wrap">
                <span className={isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-medium'}>
                  Causal Cascade Path:
                </span>
                {rca.propagationPath.map((step, idx) => (
                  <React.Fragment key={step}>
                    <span
                      className={`font-mono px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                        step === rca.rootCauseCandidate
                          ? 'bg-rose-500 text-white shadow-xs'
                          : isDark
                          ? 'bg-white/10 text-slate-200 border border-white/10'
                          : 'bg-white border border-slate-200 text-slate-700 shadow-2xs'
                      }`}
                    >
                      {step}
                    </span>
                    {idx < rca.propagationPath.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className={`text-[11px] max-w-md hidden xl:block text-right ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            GNNExplainer mutual-information edge masks confirmed the physical root cause and traced the propagation cascade.
          </div>
        </div>
      )}
    </div>
  );
};
