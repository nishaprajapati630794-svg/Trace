import React, { useState } from 'react';
import { IncidentRecord } from '../types/telemetry';
import { generateIncidentPlaybook } from '../services/geminiService';
import { CheckCircle, Sparkles, Terminal, ArrowRight, Loader2, FileText, Check } from 'lucide-react';
import { ColorTheme, THEMES } from '../types/theme';

interface IncidentsManagerProps {
  incidents: IncidentRecord[];
  onResolveIncident: (id: string) => void;
  onSelectNode: (nodeId: string) => void;
  theme?: ColorTheme;
}

export const IncidentsManager: React.FC<IncidentsManagerProps> = ({
  incidents,
  onResolveIncident,
  onSelectNode,
  theme = 'violet',
}) => {
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(
    incidents[0] || null
  );
  const [generatingPlaybook, setGeneratingPlaybook] = useState<boolean>(false);
  const [playbookContent, setPlaybookContent] = useState<string | null>(null);

  const currentTheme = THEMES[theme];
  const isDark = currentTheme.isDark;
  const activeIncident = selectedIncident || incidents[0] || null;

  const handleGeneratePlaybook = async (incident: IncidentRecord) => {
    setGeneratingPlaybook(true);
    try {
      const playbook = await generateIncidentPlaybook(incident.details);
      setPlaybookContent(playbook);
    } catch (err) {
      console.error('Playbook generation failed:', err);
    } finally {
      setGeneratingPlaybook(false);
    }
  };

  if (incidents.length === 0) {
    return (
      <div
        className={`w-full rounded-2xl border p-8 flex flex-col items-center justify-center text-center transition-colors ${
          isDark
            ? 'border-slate-800 bg-slate-900/40 text-slate-300'
            : 'border-slate-200 bg-white text-slate-700 shadow-sm'
        }`}
      >
        <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
        <h4 className="text-sm font-semibold">Zero Active Incidents</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          No microservice anomalies or cascading degradation detected in the incident store.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-5">
      {/* Incidents Master List */}
      <div
        className={`w-full lg:w-5/12 flex flex-col gap-3 rounded-2xl border p-5 transition-colors shadow-xl ${
          isDark
            ? 'bg-slate-950 border-slate-800/80 text-white shadow-black/30'
            : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-200/50'
        }`}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Persisted Incident History</h3>
            <span className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Total Recorded: {incidents.length}
            </span>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-md font-mono border ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            Async Incident Store
          </span>
        </div>

        <div className="flex flex-col gap-2 max-h-[640px] overflow-y-auto pr-1">
          {incidents.map((inc) => {
            const isSelected = activeIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => {
                  setSelectedIncident(inc);
                  setPlaybookContent(null);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 hover:scale-[1.01] ${
                  isSelected
                    ? isDark
                      ? 'bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                      : 'bg-indigo-50/70 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                    : inc.resolved
                    ? isDark
                      ? 'bg-slate-950/60 border-slate-800/60 opacity-70 hover:opacity-100'
                      : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
                    : isDark
                    ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60'
                    : 'bg-rose-50/60 border-rose-200 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        inc.resolved ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                    <span className="font-bold">{inc.rootCauseNode}</span>
                  </div>
                  <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {new Date(inc.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className={`flex items-center gap-1.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Symptom:</span>
                  <span className="font-mono font-semibold">{inc.targetNode}</span>
                  <span>·</span>
                  <span className="capitalize">{inc.faultType.replace('_', ' ')}</span>
                </div>

                <div className={`flex items-center justify-between text-[11px] font-mono pt-1.5 border-t ${isDark ? 'border-slate-900 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                  <span>&tau; = {inc.anomalyScore.toFixed(2)}</span>
                  <span className={inc.resolved ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
                    {inc.resolved ? 'RESOLVED' : 'ACTIVE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Incident RCA Detail & AI Playbook */}
      {activeIncident && (
        <div
          className={`w-full lg:w-7/12 flex flex-col gap-4 rounded-2xl border p-5 sm:p-6 transition-colors shadow-xl ${
            isDark
              ? 'bg-slate-950 border-slate-800/80 text-white shadow-black/30'
              : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-200/50'
          }`}
        >
          <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Incident Report: {activeIncident.rootCauseNode}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-md font-mono font-semibold border ${
                    activeIncident.resolved
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  }`}
                >
                  {activeIncident.resolved ? 'Resolved' : 'Active Anomaly'}
                </span>
              </div>
              <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {activeIncident.id} · Logged at {new Date(activeIncident.timestamp).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!activeIncident.resolved && (
                <button
                  onClick={() => onResolveIncident(activeIncident.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Resolved
                </button>
              )}

              <button
                onClick={() => handleGeneratePlaybook(activeIncident)}
                disabled={generatingPlaybook}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
              >
                {generatingPlaybook ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>AI Mitigation Playbook</span>
              </button>
            </div>
          </div>

          {/* Cascade Path Summary */}
          <div
            className={`p-3.5 rounded-xl border text-xs transition-colors ${
              isDark
                ? 'bg-slate-900/60 border-slate-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className={`block mb-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Causal Propagation Path:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap font-mono">
              {activeIncident.propagationPath.map((step, idx) => (
                <React.Fragment key={step}>
                  <span
                    onClick={() => onSelectNode(step)}
                    className={`cursor-pointer px-2.5 py-1 rounded-lg text-[11px] transition-all hover:scale-105 ${
                      step === activeIncident.rootCauseNode
                        ? 'bg-rose-600 text-white font-bold shadow-xs'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {step}
                  </span>
                  {idx < activeIncident.propagationPath.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-rose-500" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <p className={`text-xs leading-relaxed p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/30 border-slate-800/60 text-slate-300' : 'bg-slate-50/70 border-slate-200 text-slate-700'}`}>
            {activeIncident.summary}
          </p>

          {/* Generated Playbook */}
          {playbookContent ? (
            <div
              className={`flex flex-col gap-2.5 p-5 rounded-2xl border text-xs shadow-md ${
                isDark
                  ? 'bg-slate-900/80 border-indigo-500/40'
                  : 'bg-slate-950 text-slate-100 border-indigo-500/40 shadow-indigo-950/20'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-indigo-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-indigo-400" /> DevOps Incident Post-Mortem &amp; Remediation
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Gemini 2.5 Flash Engine</span>
              </div>
              <div className="prose prose-invert prose-xs max-w-none text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap font-mono text-[11px]">
                {playbookContent}
              </div>
            </div>
          ) : (
            <div
              className={`rounded-2xl border border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors ${
                isDark ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50/50 border-slate-200'
              }`}
            >
              <FileText className="w-7 h-7 text-slate-400 mb-2" />
              <h5 className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Remediation Playbook Ready
              </h5>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                Click "AI Mitigation Playbook" to synthesize an incident runbook with exact kubectl commands and database safeguards.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
