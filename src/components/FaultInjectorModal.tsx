import React, { useState } from 'react';
import { FaultType, ActiveFault, ServiceNode } from '../types/telemetry';
import { X, Zap, Play, Flame } from 'lucide-react';
import { ColorTheme, THEMES } from '../types/theme';

interface FaultInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: ServiceNode[];
  activeFaults: ActiveFault[];
  onTriggerFault: (faultType: FaultType, targetService: string, durationTicks: number, magnitude: number) => void;
  onClearFault: (faultId: string) => void;
  onClearAllFaults: () => void;
  theme?: ColorTheme;
}

const PRESET_SCENARIOS = [
  {
    title: 'PostgreSQL Advisory Lock & Pool Exhaustion',
    description: 'Simulates transaction serialization lock in PostgreSQL, driving query latencies to 1500ms and starving checkout worker threads.',
    target: 'db-cluster',
    type: 'latency_spike' as FaultType,
    magnitude: 4.2,
    duration: 18,
    badge: 'Recommended RCA Demo',
  },
  {
    title: 'Stripe Gateway Downstream Cascade',
    description: 'External payment partner returns HTTP 504 timeouts, blocking payment-service and cascading backpressure to order-service.',
    target: 'external-stripe-gw',
    type: 'error_cascade' as FaultType,
    magnitude: 3.8,
    duration: 15,
    badge: 'Cascading Backpressure',
  },
  {
    title: 'Redis Cache Memory Saturation Storm',
    description: 'Triggers memory exhaustion and key eviction thrashing in Redis, spiking CPU to 98% and degrading profile reads.',
    target: 'redis-cache',
    type: 'resource_exhaustion' as FaultType,
    magnitude: 4.5,
    duration: 20,
    badge: 'Resource Saturation',
  },
  {
    title: 'Payment Pod Socket Partition',
    description: 'Drops inter-service TCP packets to payment-service, inducing gRPC DEADLINE_EXCEEDED errors at checkout-service.',
    target: 'payment-service',
    type: 'network_partition' as FaultType,
    magnitude: 3.5,
    duration: 15,
    badge: 'Network Partition',
  },
];

export const FaultInjectorModal: React.FC<FaultInjectorModalProps> = ({
  isOpen,
  onClose,
  nodes,
  activeFaults,
  onTriggerFault,
  onClearFault,
  onClearAllFaults,
  theme = 'violet',
}) => {
  const [selectedService, setSelectedService] = useState<string>('db-cluster');
  const [faultType, setFaultType] = useState<FaultType>('latency_spike');
  const [durationTicks, setDurationTicks] = useState<number>(15);
  const [magnitude, setMagnitude] = useState<number>(3.5);

  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;

  if (!isOpen) return null;

  const handleCustomInject = (e: React.FormEvent) => {
    e.preventDefault();
    onTriggerFault(faultType, selectedService, durationTicks, magnitude);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl rounded-2xl border p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto transition-colors shadow-2xl ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-white shadow-black/60'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isDark
                  ? 'bg-rose-950/80 border border-rose-700/60 text-rose-400'
                  : 'bg-rose-50 border border-rose-200 text-rose-600 shadow-xs'
              }`}
            >
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Synthetic Fault Injector</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Stress-test Spatial-Temporal GAT model inference and verify GNNExplainer root cause analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Faults Banner */}
        {activeFaults.length > 0 && (
          <div
            className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
              isDark
                ? 'bg-rose-950/40 border-rose-900/60 text-rose-200'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-rose-500">
                <Flame className="w-4 h-4 animate-bounce" />
                Active Faults Injected ({activeFaults.length})
              </span>
              <button
                onClick={onClearAllFaults}
                className="text-xs text-rose-500 hover:underline font-mono font-semibold cursor-pointer"
              >
                Clear All Faults
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {activeFaults.map((f) => (
                <div
                  key={f.faultId}
                  className={`flex items-center justify-between text-xs font-mono p-2.5 rounded-lg border ${
                    isDark
                      ? 'bg-slate-950/60 border-rose-900/40 text-slate-200'
                      : 'bg-white border-rose-200 text-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{f.targetService}</span>
                    <span className="opacity-75">({f.faultType.replace('_', ' ')})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-rose-500 font-bold">{f.remainingTicks} ticks left</span>
                    <button
                      onClick={() => onClearFault(f.faultId)}
                      className="opacity-70 hover:opacity-100 hover:text-rose-500 cursor-pointer text-xs"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preset Scenarios */}
        <div className="flex flex-col gap-3">
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            One-Click Chaos Engineering Scenarios:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRESET_SCENARIOS.map((sc, idx) => (
              <div
                key={idx}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all gap-3 hover:scale-[1.01] ${
                  isDark
                    ? 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700'
                    : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold">{sc.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono border ${
                        isDark
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      }`}
                    >
                      {sc.badge}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {sc.description}
                  </p>
                </div>

                <div
                  className={`flex items-center justify-between pt-2.5 border-t text-xs ${
                    isDark ? 'border-slate-800/60' : 'border-slate-200/80'
                  }`}
                >
                  <span className={`font-mono text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    Target: <strong className={isDark ? 'text-slate-300' : 'text-slate-800'}>{sc.target}</strong>
                  </span>
                  <button
                    onClick={() => {
                      onTriggerFault(sc.type, sc.target, sc.duration, sc.magnitude);
                    }}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-all flex items-center gap-1 shadow-sm shadow-rose-600/30 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Inject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Fault Injection Form */}
        <form onSubmit={handleCustomInject} className={`flex flex-col gap-4 border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Custom Fault Parameter Setup:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Target Service
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className={`w-full rounded-xl p-2.5 font-mono border focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-indigo-600'
                }`}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.tier})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Fault Type
              </label>
              <select
                value={faultType}
                onChange={(e) => setFaultType(e.target.value as FaultType)}
                className={`w-full rounded-xl p-2.5 font-mono border focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-indigo-500'
                    : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-indigo-600'
                }`}
              >
                <option value="latency_spike">latency_spike (Query Lock & Delays)</option>
                <option value="error_cascade">error_cascade (5xx HTTP/gRPC Exceptions)</option>
                <option value="resource_exhaustion">resource_exhaustion (CPU/RAM Throttling)</option>
                <option value="network_partition">network_partition (Packet Drops & Timeouts)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  Duration (Ticks / Seconds)
                </label>
                <span className="font-mono text-indigo-500 font-bold">{durationTicks}s</span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                value={durationTicks}
                onChange={(e) => setDurationTicks(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                  Magnitude Multiplier
                </label>
                <span className="font-mono text-indigo-500 font-bold">{magnitude.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="6.0"
                step="0.5"
                value={magnitude}
                onChange={(e) => setMagnitude(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all cursor-pointer hover:scale-102"
            >
              Apply Custom Fault
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
