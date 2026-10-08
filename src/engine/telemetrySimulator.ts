import {
  ServiceNode,
  EdgeDependency,
  ActiveFault,
  FaultType,
  TraceRecord,
  Span,
  TelemetrySnapshot,
  IncidentRecord,
} from '../types/telemetry';
import { gnnEngine } from './gnnEngine';

export class TelemetrySimulator {
  private nodes: ServiceNode[] = [];
  private edges: EdgeDependency[] = [];
  private activeFaults: Map<string, ActiveFault> = new Map();
  private persistedIncidents: IncidentRecord[] = [];
  private currentTick: number = 0;
  private traceBuffer: TraceRecord[] = [];

  constructor() {
    this.initTopology();
  }

  private initTopology() {
    // 12 Realistic Microservices across Tiers
    const initialServices: Omit<ServiceNode, 'history' | 'currentMetrics' | 'anomalyScore'>[] = [
      { id: 'api-gateway', name: 'api-gateway', tier: 'edge', host: 'edge-gw-01.k8s', version: 'v2.4.1', status: 'nominal' },
      { id: 'auth-service', name: 'auth-service', tier: 'core', host: 'auth-pod-3a.k8s', version: 'v1.9.0', status: 'nominal' },
      { id: 'user-profile', name: 'user-profile', tier: 'core', host: 'user-pod-1b.k8s', version: 'v2.1.2', status: 'nominal' },
      { id: 'checkout-service', name: 'checkout-service', tier: 'business', host: 'chk-pod-8c.k8s', version: 'v3.0.4', status: 'nominal' },
      { id: 'order-service', name: 'order-service', tier: 'business', host: 'ord-pod-4d.k8s', version: 'v3.1.0', status: 'nominal' },
      { id: 'inventory-service', name: 'inventory-service', tier: 'business', host: 'inv-pod-2a.k8s', version: 'v1.8.3', status: 'nominal' },
      { id: 'payment-service', name: 'payment-service', tier: 'business', host: 'pay-pod-9e.k8s', version: 'v2.5.6', status: 'nominal' },
      { id: 'notification-service', name: 'notification-service', tier: 'messaging', host: 'notif-pod-1c.k8s', version: 'v1.4.1', status: 'nominal' },
      { id: 'kafka-broker', name: 'kafka-broker', tier: 'messaging', host: 'kafka-node-02.internal', version: 'v3.5.1', status: 'nominal' },
      { id: 'redis-cache', name: 'redis-cache', tier: 'cache', host: 'redis-cluster-m01.internal', version: 'v7.2.4', status: 'nominal' },
      { id: 'db-cluster', name: 'db-cluster', tier: 'data', host: 'pg-aurora-primary.internal', version: 'PostgreSQL-16.1', status: 'nominal' },
      { id: 'external-stripe-gw', name: 'external-stripe-gw', tier: 'external', host: 'api.stripe.com', version: 'API-2024-06', status: 'nominal' },
    ];

    const now = Date.now();
    this.nodes = initialServices.map((svc) => {
      const baseMetrics = this.getBaseMetricsForTier(svc.tier);
      // Pre-populate 20 ticks history for T=20 window
      const history = [];
      for (let t = 20; t >= 1; t--) {
        history.push({
          ...baseMetrics,
          latencyMs: Math.max(5, baseMetrics.latencyMs + (Math.random() * 8 - 4)),
          requestRate: Math.max(10, baseMetrics.requestRate + (Math.random() * 20 - 10)),
          cpuPct: Math.max(10, baseMetrics.cpuPct + (Math.random() * 6 - 3)),
          memPct: Math.max(15, baseMetrics.memPct + (Math.random() * 4 - 2)),
          timestamp: now - t * 1000,
          tick: -t,
        });
      }

      return {
        ...svc,
        currentMetrics: { ...baseMetrics },
        history,
        anomalyScore: 0.05,
      };
    });

    // Realistic Microservice Caller -> Callee Call Graph
    this.edges = [
      { id: 'e1', source: 'api-gateway', target: 'auth-service', callType: 'grpc', rps: 450, meanLatency: 12, errorRate: 0.001 },
      { id: 'e2', source: 'api-gateway', target: 'user-profile', callType: 'grpc', rps: 320, meanLatency: 18, errorRate: 0.001 },
      { id: 'e3', source: 'api-gateway', target: 'checkout-service', callType: 'http', rps: 280, meanLatency: 45, errorRate: 0.002 },
      { id: 'e4', source: 'checkout-service', target: 'order-service', callType: 'grpc', rps: 260, meanLatency: 35, errorRate: 0.002 },
      { id: 'e5', source: 'checkout-service', target: 'inventory-service', callType: 'grpc', rps: 275, meanLatency: 22, errorRate: 0.001 },
      { id: 'e6', source: 'order-service', target: 'payment-service', callType: 'grpc', rps: 190, meanLatency: 55, errorRate: 0.003 },
      { id: 'e7', source: 'order-service', target: 'kafka-broker', callType: 'async', rps: 210, meanLatency: 14, errorRate: 0.000 },
      { id: 'e8', source: 'payment-service', target: 'db-cluster', callType: 'db_conn', rps: 185, meanLatency: 28, errorRate: 0.001 },
      { id: 'e9', source: 'payment-service', target: 'external-stripe-gw', callType: 'http', rps: 160, meanLatency: 140, errorRate: 0.005 },
      { id: 'e10', source: 'order-service', target: 'db-cluster', callType: 'db_conn', rps: 240, meanLatency: 24, errorRate: 0.001 },
      { id: 'e11', source: 'user-profile', target: 'redis-cache', callType: 'grpc', rps: 310, meanLatency: 6, errorRate: 0.000 },
      { id: 'e12', source: 'user-profile', target: 'db-cluster', callType: 'db_conn', rps: 80, meanLatency: 20, errorRate: 0.001 },
      { id: 'e13', source: 'auth-service', target: 'redis-cache', callType: 'grpc', rps: 420, meanLatency: 5, errorRate: 0.000 },
      { id: 'e14', source: 'kafka-broker', target: 'notification-service', callType: 'async', rps: 195, meanLatency: 16, errorRate: 0.001 },
    ];
  }

  private getBaseMetricsForTier(tier: string) {
    switch (tier) {
      case 'edge':
        return { latencyMs: 25, errorRate: 0.002, requestRate: 650, cpuPct: 32, memPct: 45 };
      case 'core':
        return { latencyMs: 15, errorRate: 0.001, requestRate: 400, cpuPct: 28, memPct: 40 };
      case 'business':
        return { latencyMs: 38, errorRate: 0.003, requestRate: 250, cpuPct: 42, memPct: 52 };
      case 'data':
        return { latencyMs: 22, errorRate: 0.001, requestRate: 500, cpuPct: 35, memPct: 62 };
      case 'cache':
        return { latencyMs: 6, errorRate: 0.000, requestRate: 750, cpuPct: 22, memPct: 58 };
      case 'messaging':
        return { latencyMs: 12, errorRate: 0.001, requestRate: 420, cpuPct: 30, memPct: 48 };
      case 'external':
        return { latencyMs: 135, errorRate: 0.005, requestRate: 160, cpuPct: 15, memPct: 25 };
      default:
        return { latencyMs: 25, errorRate: 0.002, requestRate: 200, cpuPct: 30, memPct: 50 };
    }
  }

  /**
   * Inject synthetic anomaly
   */
  public triggerFault(
    faultType: FaultType,
    targetService: string,
    durationTicks: number = 15,
    magnitude: number = 3.5
  ): ActiveFault {
    const faultId = `fault_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const descriptions: Record<FaultType, string> = {
      latency_spike: `High query execution delay & pool exhaustion on ${targetService}`,
      error_cascade: `Cascading 5xx unhandled exceptions bubbling up from ${targetService}`,
      resource_exhaustion: `Severe CPU & Memory saturation (95%+) throttling ${targetService}`,
      network_partition: `Connection timeouts and socket packet drops on ${targetService}`,
    };

    const fault: ActiveFault = {
      faultId,
      faultType,
      targetService,
      durationTicks,
      remainingTicks: durationTicks,
      magnitude,
      createdAt: Date.now(),
      description: descriptions[faultType],
    };

    this.activeFaults.set(faultId, fault);
    return fault;
  }

  public clearAllFaults() {
    this.activeFaults.clear();
  }

  public clearFault(faultId: string) {
    this.activeFaults.delete(faultId);
  }

  public getActiveFaults(): ActiveFault[] {
    return Array.from(this.activeFaults.values());
  }

  public getPersistedIncidents(): IncidentRecord[] {
    return this.persistedIncidents;
  }

  /**
   * Advance simulation by 1 Tick (Default 1 second in real-time)
   */
  public tick(): TelemetrySnapshot {
    this.currentTick++;
    const now = Date.now();

    // 1. Process active faults countdown
    const activeFaultList = Array.from(this.activeFaults.values());
    for (const fault of activeFaultList) {
      fault.remainingTicks--;
      if (fault.remainingTicks <= 0) {
        this.activeFaults.delete(fault.faultId);
      }
    }

    // 2. Identify services directly faulted or affected by cascade
    const faultImpacts = new Map<string, { latencyMult: number; errorAdd: number; cpuAdd: number; memAdd: number }>();
    for (const node of this.nodes) {
      faultImpacts.set(node.id, { latencyMult: 1.0, errorAdd: 0.0, cpuAdd: 0, memAdd: 0 });
    }

    // Apply primary faults
    let primaryFaultType: FaultType | undefined;
    for (const fault of this.activeFaults.values()) {
      primaryFaultType = fault.faultType;
      const impact = faultImpacts.get(fault.targetService);
      if (!impact) continue;

      switch (fault.faultType) {
        case 'latency_spike':
          impact.latencyMult += fault.magnitude * 4.5;
          impact.errorAdd += 0.05 * (fault.magnitude / 2);
          impact.cpuAdd += 25 * (fault.magnitude / 2);
          break;
        case 'error_cascade':
          impact.errorAdd += 0.35 * fault.magnitude;
          impact.latencyMult += fault.magnitude * 1.5;
          break;
        case 'resource_exhaustion':
          impact.cpuAdd += 45 * (fault.magnitude / 2);
          impact.memAdd += 40 * (fault.magnitude / 2);
          impact.latencyMult += fault.magnitude * 2.8;
          impact.errorAdd += 0.12 * (fault.magnitude / 2);
          break;
        case 'network_partition':
          impact.errorAdd += 0.5 * fault.magnitude;
          impact.latencyMult += fault.magnitude * 6.0;
          break;
      }
    }

    // Causal Backpressure Cascade Propagation
    // If db-cluster is slow -> payment-service & order-service slow down -> checkout-service slows down -> api-gateway experiences timeouts!
    const propagateCallers = (calleeId: string, upstreamRatio: number) => {
      const callers = this.edges.filter((e) => e.target === calleeId).map((e) => e.source);
      for (const callerId of callers) {
        const callerImpact = faultImpacts.get(callerId);
        const calleeImpact = faultImpacts.get(calleeId);
        if (callerImpact && calleeImpact && calleeImpact.latencyMult > 1.5) {
          callerImpact.latencyMult += (calleeImpact.latencyMult - 1) * upstreamRatio;
          callerImpact.errorAdd += calleeImpact.errorAdd * 0.6;
          callerImpact.cpuAdd += 12 * upstreamRatio;
        }
      }
    };

    if (this.activeFaults.size > 0) {
      propagateCallers('db-cluster', 0.55);
      propagateCallers('external-stripe-gw', 0.5);
      propagateCallers('payment-service', 0.65);
      propagateCallers('order-service', 0.7);
      propagateCallers('redis-cache', 0.4);
    }

    // 3. Update Service Node Metrics
    for (const node of this.nodes) {
      const base = this.getBaseMetricsForTier(node.tier);
      const impact = faultImpacts.get(node.id) || { latencyMult: 1.0, errorAdd: 0.0, cpuAdd: 0, memAdd: 0 };

      // Normal organic noise
      const noiseLatency = (Math.random() * 4 - 2);
      const noiseRps = (Math.random() * 20 - 10);
      const noiseCpu = (Math.random() * 4 - 2);

      const newLatency = Math.max(4, Math.round(base.latencyMs * impact.latencyMult + noiseLatency));
      const newErrorRate = Math.max(0, Math.min(0.99, Number((base.errorRate + impact.errorAdd).toFixed(4))));
      const newRps = Math.max(10, Math.round(base.requestRate * (1 - impact.errorAdd * 0.4) + noiseRps));
      const newCpu = Math.max(5, Math.min(99, Math.round(base.cpuPct + impact.cpuAdd + noiseCpu)));
      const newMem = Math.max(10, Math.min(98, Math.round(base.memPct + impact.memAdd + (Math.random() * 2 - 1))));

      node.currentMetrics = {
        latencyMs: newLatency,
        errorRate: newErrorRate,
        requestRate: newRps,
        cpuPct: newCpu,
        memPct: newMem,
      };

      // Append to sliding window history
      node.history.push({
        ...node.currentMetrics,
        timestamp: now,
        tick: this.currentTick,
      });

      // Maintain exact T=20 window size
      if (node.history.length > 20) {
        node.history.shift();
      }
    }

    // 4. Update Edges based on updated nodes
    const nodeMap = new Map(this.nodes.map((n) => [n.id, n]));
    for (const edge of this.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (src && tgt) {
        const avgLat = (src.currentMetrics.latencyMs * 0.3 + tgt.currentMetrics.latencyMs * 0.7);
        edge.meanLatency = Math.round(avgLat);
        edge.errorRate = Math.max(src.currentMetrics.errorRate, tgt.currentMetrics.errorRate);
      }
    }

    // 5. Generate Synthetic Distributed OTel Traces
    this.generateSyntheticTraces(now);

    // 6. Run Spatial-Temporal GNN Inference & RCA
    const gnnResult = gnnEngine.runInference(this.nodes, this.edges, primaryFaultType);

    // 7. Persist incident if new severe anomaly detected
    if (gnnResult.rcaReport && gnnResult.anomalousNodes.length > 0) {
      const latestIncident = this.persistedIncidents[0];
      const hasRecentSameIncident = latestIncident &&
        latestIncident.rootCauseNode === gnnResult.rcaReport.rootCauseCandidate &&
        now - latestIncident.timestamp < 10000;

      if (!hasRecentSameIncident) {
        const fault = Array.from(this.activeFaults.values())[0];
        const newRecord: IncidentRecord = {
          id: gnnResult.rcaReport.incidentId,
          timestamp: now,
          targetNode: gnnResult.rcaReport.targetNode,
          rootCauseNode: gnnResult.rcaReport.rootCauseCandidate,
          anomalyScore: gnnResult.nodeAnomalyScores[gnnResult.rcaReport.rootCauseCandidate] || 0.85,
          faultType: fault ? fault.faultType : 'latency_spike',
          propagationPath: gnnResult.rcaReport.propagationPath,
          resolved: false,
          summary: gnnResult.rcaReport.explanationSummary,
          details: gnnResult.rcaReport,
        };
        this.persistedIncidents.unshift(newRecord);
        if (this.persistedIncidents.length > 25) {
          this.persistedIncidents.pop();
        }
      }
    }

    return {
      tick: this.currentTick,
      timestamp: now,
      nodes: [...this.nodes],
      edges: [...this.edges],
      traces: this.traceBuffer.slice(0, 10),
      activeFaults: Array.from(this.activeFaults.values()),
      anomalyDetected: gnnResult.anomalousNodes.length > 0,
      anomalousNodes: gnnResult.anomalousNodes,
      currentRCA: gnnResult.rcaReport,
    };
  }

  /**
   * Generates realistic OpenTelemetry trace with nested spans
   */
  private generateSyntheticTraces(timestamp: number) {
    const traceId = `trace_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    const checkoutNode = this.nodes.find((n) => n.id === 'checkout-service');
    const dbNode = this.nodes.find((n) => n.id === 'db-cluster');
    const paymentNode = this.nodes.find((n) => n.id === 'payment-service');

    const isError = (checkoutNode?.currentMetrics.errorRate || 0) > 0.08 ||
                    (dbNode?.currentMetrics.latencyMs || 0) > 400;

    const spanRoot: Span = {
      traceId,
      spanId: 'span_root_001',
      serviceName: 'api-gateway',
      operationName: 'POST /v2/checkout/place-order',
      startTimeOffsetMs: 0,
      durationMs: checkoutNode?.currentMetrics.latencyMs ? checkoutNode.currentMetrics.latencyMs + 28 : 85,
      statusCode: isError ? 504 : 200,
      error: isError ? 'GatewayTimeout: upstream service took too long to respond' : undefined,
      attributes: { 'http.method': 'POST', 'http.status_code': isError ? 504 : 200 },
    };

    const spanCheckout: Span = {
      traceId,
      spanId: 'span_chk_002',
      parentSpanId: 'span_root_001',
      serviceName: 'checkout-service',
      operationName: 'CheckoutHandler.ProcessOrder',
      startTimeOffsetMs: 6,
      durationMs: checkoutNode?.currentMetrics.latencyMs || 55,
      statusCode: isError ? 500 : 200,
      error: isError ? 'Downstream RPC Failure in OrderService' : undefined,
      attributes: { 'rpc.system': 'grpc', 'rpc.service': 'CheckoutService' },
    };

    const spanOrder: Span = {
      traceId,
      spanId: 'span_ord_003',
      parentSpanId: 'span_chk_002',
      serviceName: 'order-service',
      operationName: 'OrderService.CreateOrder',
      startTimeOffsetMs: 14,
      durationMs: (paymentNode?.currentMetrics.latencyMs || 30) + 18,
      statusCode: isError ? 500 : 200,
      error: isError ? 'PaymentProcessingTimeout' : undefined,
      attributes: { 'rpc.system': 'grpc', 'order.id': `ord_${Math.floor(Math.random() * 900000 + 100000)}` },
    };

    const spanPayment: Span = {
      traceId,
      spanId: 'span_pay_004',
      parentSpanId: 'span_ord_003',
      serviceName: 'payment-service',
      operationName: 'PaymentService.ChargeCustomer',
      startTimeOffsetMs: 24,
      durationMs: paymentNode?.currentMetrics.latencyMs || 45,
      statusCode: isError ? 500 : 200,
      error: isError ? 'ConnectionPoolTimeout: db-cluster query blocked' : undefined,
      attributes: { 'payment.provider': 'stripe', 'currency': 'USD' },
    };

    const spanDb: Span = {
      traceId,
      spanId: 'span_db_005',
      parentSpanId: 'span_pay_004',
      serviceName: 'db-cluster',
      operationName: 'SELECT pg_advisory_xact_lock(account_id) FOR UPDATE',
      startTimeOffsetMs: 32,
      durationMs: dbNode?.currentMetrics.latencyMs || 22,
      statusCode: isError ? 500 : 200,
      error: isError ? 'QueryExecutionTimeout: lock wait timeout exceeded' : undefined,
      attributes: { 'db.system': 'postgresql', 'db.statement': 'SELECT * FROM accounts WHERE id = ? FOR UPDATE' },
    };

    const trace: TraceRecord = {
      traceId,
      rootService: 'api-gateway',
      operation: 'POST /v2/checkout/place-order',
      startTime: timestamp,
      totalDurationMs: spanRoot.durationMs,
      status: isError ? 'error' : 'ok',
      spans: [spanRoot, spanCheckout, spanOrder, spanPayment, spanDb],
    };

    this.traceBuffer.unshift(trace);
    if (this.traceBuffer.length > 20) {
      this.traceBuffer.pop();
    }
  }

  public resolveIncident(id: string) {
    const inc = this.persistedIncidents.find((i) => i.id === id);
    if (inc) {
      inc.resolved = true;
    }
  }
}

export const telemetrySimulator = new TelemetrySimulator();
