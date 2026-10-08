export type ServiceTier = 'edge' | 'core' | 'business' | 'data' | 'cache' | 'messaging' | 'external';

export type FaultType = 'latency_spike' | 'error_cascade' | 'resource_exhaustion' | 'network_partition';

export interface ServiceMetrics {
  latencyMs: number;
  errorRate: number; // 0.0 to 1.0
  requestRate: number; // requests / sec
  cpuPct: number; // 0 to 100
  memPct: number; // 0 to 100
}

export interface MetricHistoryPoint extends ServiceMetrics {
  timestamp: number;
  tick: number;
}

export interface ServiceNode {
  id: string;
  name: string;
  tier: ServiceTier;
  host: string;
  version: string;
  status: 'nominal' | 'degraded' | 'critical';
  currentMetrics: ServiceMetrics;
  history: MetricHistoryPoint[]; // Last T=20 points
  normalizedFeatures?: number[][]; // [20, 5] normalized
  anomalyScore: number; // 0.0 to 1.0
  isRootCause?: boolean;
  isInCascadePath?: boolean;
}

export interface EdgeDependency {
  id: string;
  source: string; // Caller
  target: string; // Callee
  callType: 'grpc' | 'http' | 'async' | 'db_conn';
  rps: number;
  meanLatency: number;
  errorRate: number;
  attributionWeight?: number; // GNNExplainer edge importance [0, 1]
  isCausalPath?: boolean;
  isAnomalous?: boolean;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  operationName: string;
  startTimeOffsetMs: number;
  durationMs: number;
  statusCode: number; // 200, 500, 504, etc.
  error?: string;
  attributes: Record<string, string | number | boolean>;
}

export interface TraceRecord {
  traceId: string;
  rootService: string;
  operation: string;
  startTime: number;
  totalDurationMs: number;
  status: 'ok' | 'error';
  spans: Span[];
}

export interface ActiveFault {
  faultId: string;
  faultType: FaultType;
  targetService: string;
  durationTicks: number;
  remainingTicks: number;
  magnitude: number;
  createdAt: number;
  description: string;
}

export interface EdgeAttribution {
  source: string;
  target: string;
  importance: number; // 0.0 to 1.0
  latencyMs: number;
  errorRate: number;
}

export interface RCAReport {
  incidentId: string;
  timestamp: number;
  targetNode: string; // Node where symptom was detected
  rootCauseCandidate: string; // Physical root cause pinpointed by GNNExplainer
  rootCauseConfidence: number; // [0, 1]
  propagationPath: string[]; // Order of cascade: [root, ..., target]
  edgeAttributions: EdgeAttribution[];
  nodeAttributions: Record<string, number>;
  explanationSummary: string;
  aiMitigationPlaybook?: string;
}

export interface IncidentRecord {
  id: string;
  timestamp: number;
  targetNode: string;
  rootCauseNode: string;
  anomalyScore: number;
  faultType: FaultType;
  propagationPath: string[];
  resolved: boolean;
  summary: string;
  details: RCAReport;
}

export interface TelemetrySnapshot {
  tick: number;
  timestamp: number;
  nodes: ServiceNode[];
  edges: EdgeDependency[];
  traces: TraceRecord[];
  activeFaults: ActiveFault[];
  anomalyDetected: boolean;
  anomalousNodes: string[];
  currentRCA: RCAReport | null;
}
