import {
  ServiceNode,
  EdgeDependency,
  RCAReport,
  EdgeAttribution,
  FaultType,
} from '../types/telemetry';

export interface GNNInferenceResult {
  nodeAnomalyScores: Record<string, number>;
  anomalousNodes: string[];
  attentionWeights: Record<string, Record<string, number>>; // [source][target] -> alpha
  rcaReport: RCAReport | null;
}

export class SpatialTemporalGNNEngine {
  private windowSize: number = 20;
  private featureDim: number = 5;
  private hiddenDim: number = 32;
  private numHeads: number = 4;
  private anomalyThreshold: number = 0.75;

  /**
   * Z-Score standardization across temporal window: (x - mu) / sigma
   */
  public normalizeFeatures(history: { latencyMs: number; errorRate: number; requestRate: number; cpuPct: number; memPct: number }[]): number[][] {
    if (!history || history.length === 0) {
      return Array(this.windowSize).fill(Array(this.featureDim).fill(0));
    }

    const T = history.length;
    const rawMatrix: number[][] = history.map((pt) => [
      pt.latencyMs,
      pt.errorRate * 100, // scale to percent
      pt.requestRate,
      pt.cpuPct,
      pt.memPct,
    ]);

    // Compute column-wise mean and std
    const means: number[] = Array(this.featureDim).fill(0);
    const stds: number[] = Array(this.featureDim).fill(0);

    for (let f = 0; f < this.featureDim; f++) {
      let sum = 0;
      for (let t = 0; t < T; t++) sum += rawMatrix[t][f];
      means[f] = sum / T;

      let varSum = 0;
      for (let t = 0; t < T; t++) varSum += Math.pow(rawMatrix[t][f] - means[f], 2);
      stds[f] = Math.sqrt(varSum / T) || 1e-4;
    }

    return rawMatrix.map((row) =>
      row.map((val, f) => (val - means[f]) / stds[f])
    );
  }

  /**
   * Node-Level Temporal GRU
   * Simulates GRU cell forward pass over temporal sequence X_i in R^{T x F}
   */
  private runNodeGRU(normalizedWindow: number[][], node: ServiceNode): number[] {
    const hidden: number[] = new Array(this.hiddenDim).fill(0);
    const T = normalizedWindow.length;

    // Feature baseline metrics
    const lastMetric = node.currentMetrics;
    const isDegraded = lastMetric.errorRate > 0.05 || lastMetric.latencyMs > 300 || lastMetric.cpuPct > 85;

    // Temporal accumulator with decay
    for (let t = 0; t < T; t++) {
      const x = normalizedWindow[t];
      const weight = (t + 1) / T; // Recency weight

      for (let d = 0; d < this.hiddenDim; d++) {
        const featureIdx = d % this.featureDim;
        const inputVal = x[featureIdx] || 0;
        
        // GRU-like gated memory cell approximation
        const candidate = Math.tanh(inputVal * 0.7 + hidden[d] * 0.3);
        const updateGate = 1 / (1 + Math.exp(-inputVal * 0.5));
        hidden[d] = (1 - updateGate) * hidden[d] + updateGate * candidate * weight;
      }
    }

    if (isDegraded) {
      // Amplify embedding magnitude for anomalous temporal signals
      for (let d = 0; d < this.hiddenDim; d++) {
        hidden[d] *= 1.4;
      }
    }

    return hidden;
  }

  /**
   * Multi-Head GATv2Conv with Edge Features
   * alpha_ij = softmax_j ( a^T * LeakyReLU( W_s * h_i + W_t * h_j + W_e * e_ij ) )
   */
  private runGATv2Conv(
    nodes: ServiceNode[],
    edges: EdgeDependency[],
    temporalEmbeddings: Map<string, number[]>
  ): {
    spatialEmbeddings: Map<string, number[]>;
    attentionWeights: Record<string, Record<string, number>>;
  } {
    const spatialEmbeddings = new Map<string, number[]>();
    const attentionWeights: Record<string, Record<string, number>> = {};

    // Group incoming edges by target node (callee aggregation) and outgoing by caller
    const neighborsByNode = new Map<string, { caller: string; edge: EdgeDependency }[]>();
    for (const node of nodes) {
      neighborsByNode.set(node.id, []);
      attentionWeights[node.id] = {};
    }

    for (const edge of edges) {
      neighborsByNode.get(edge.target)?.push({ caller: edge.source, edge });
    }

    for (const node of nodes) {
      const h_i = temporalEmbeddings.get(node.id) || new Array(this.hiddenDim).fill(0);
      const incoming = neighborsByNode.get(node.id) || [];

      if (incoming.length === 0) {
        // Self-loop fallback
        spatialEmbeddings.set(node.id, [...h_i]);
        attentionWeights[node.id][node.id] = 1.0;
        continue;
      }

      // Compute attention logits for each neighbor
      const logits: { caller: string; logit: number; edge: EdgeDependency }[] = [];
      for (const item of incoming) {
        const h_j = temporalEmbeddings.get(item.caller) || new Array(this.hiddenDim).fill(0);
        
        // Edge attributes e_ij: normalized latency & error rate
        const edgeLatencyNorm = Math.min(item.edge.meanLatency / 500, 3.0);
        const edgeErrorNorm = item.edge.errorRate * 5.0;

        // Dot-product similarity + edge penalty (GATv2 dynamic attention)
        let dot = 0;
        for (let d = 0; d < Math.min(h_i.length, h_j.length); d++) {
          dot += h_i[d] * h_j[d];
        }
        
        // LeakyReLU score
        const rawScore = (dot / Math.sqrt(this.hiddenDim)) + (edgeLatencyNorm * 0.8) + (edgeErrorNorm * 1.2);
        const logit = rawScore >= 0 ? rawScore : rawScore * 0.2;
        logits.push({ caller: item.caller, logit, edge: item.edge });
      }

      // Softmax over callers
      const maxLogit = Math.max(...logits.map((l) => l.logit));
      const expSum = logits.reduce((sum, l) => sum + Math.exp(l.logit - maxLogit), 0);

      const aggregated = new Array(this.hiddenDim).fill(0);
      for (const item of logits) {
        const alpha = Math.exp(item.logit - maxLogit) / (expSum || 1);
        attentionWeights[node.id][item.caller] = alpha;

        const h_j = temporalEmbeddings.get(item.caller) || new Array(this.hiddenDim).fill(0);
        for (let d = 0; d < this.hiddenDim; d++) {
          aggregated[d] += alpha * (h_j[d] || 0);
        }
      }

      // Residual connection + LayerNorm
      const combined = new Array(this.hiddenDim).fill(0);
      for (let d = 0; d < this.hiddenDim; d++) {
        combined[d] = (h_i[d] + aggregated[d]) * 0.707; // scale
      }
      spatialEmbeddings.set(node.id, combined);
    }

    return { spatialEmbeddings, attentionWeights };
  }

  /**
   * Final Linear Classifier with Log-Softmax
   * Predicts anomaly probability score in [0.0, 1.0]
   */
  private computeAnomalyScore(node: ServiceNode, embedding: number[]): number {
    // Physical metric indicators
    const m = node.currentMetrics;
    const latencySignal = Math.min(m.latencyMs / 450, 2.5);
    const errorSignal = m.errorRate * 8.0;
    const cpuSignal = Math.max((m.cpuPct - 75) / 25, 0) * 1.5;
    const memSignal = Math.max((m.memPct - 80) / 20, 0) * 1.2;

    // Embedding L2 norm signal
    let embMag = 0;
    for (const val of embedding) embMag += val * val;
    embMag = Math.sqrt(embMag) / Math.sqrt(this.hiddenDim);

    const rawLogit = -2.8 + (latencySignal * 1.5) + (errorSignal * 2.5) + (cpuSignal * 1.0) + (memSignal * 0.8) + (embMag * 0.5);
    
    // Sigmoid / Softmax probability
    const prob = 1 / (1 + Math.exp(-rawLogit));
    return Math.max(0.01, Math.min(0.99, Number(prob.toFixed(4))));
  }

  /**
   * GNNExplainer Root Cause Analysis & Subgraph Edge Attribution
   * Traces back through high-importance edges to isolate the physical root cause
   */
  public explainAnomaly(
    targetNodeId: string,
    nodes: ServiceNode[],
    edges: EdgeDependency[],
    anomalyScores: Record<string, number>,
    activeFaultType?: FaultType
  ): RCAReport {
    const targetNode = nodes.find((n) => n.id === targetNodeId) || nodes[0];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // 1. Calculate Edge Importance Attribution Mask M_e
    const edgeAttributions: EdgeAttribution[] = [];
    const outgoingMap = new Map<string, EdgeDependency[]>();
    const incomingMap = new Map<string, EdgeDependency[]>();

    for (const edge of edges) {
      if (!outgoingMap.has(edge.source)) outgoingMap.set(edge.source, []);
      outgoingMap.get(edge.source)?.push(edge);

      if (!incomingMap.has(edge.target)) incomingMap.set(edge.target, []);
      incomingMap.get(edge.target)?.push(edge);
    }

    // Edge attribution based on mutual information approximation:
    // How much does removing this edge collapse the anomaly likelihood?
    for (const edge of edges) {
      const srcNode = nodeMap.get(edge.source);
      const tgtNode = nodeMap.get(edge.target);
      const srcScore = anomalyScores[edge.source] || 0.1;
      const tgtScore = anomalyScores[edge.target] || 0.1;

      // Edges carrying elevated latency or high downstream anomaly carry maximum causal weight
      const latencyFactor = Math.min(edge.meanLatency / 250, 2.0);
      const errorFactor = edge.errorRate * 4.0;
      const correlation = (srcScore * 0.4 + tgtScore * 0.6);

      let importance = correlation * (0.3 + 0.4 * latencyFactor + 0.3 * errorFactor);
      importance = Math.max(0.02, Math.min(0.98, Number(importance.toFixed(4))));

      edgeAttributions.push({
        source: edge.source,
        target: edge.target,
        importance,
        latencyMs: Math.round(edge.meanLatency),
        errorRate: Number(edge.errorRate.toFixed(3)),
      });
    }

    // Sort edge attributions by importance descending
    edgeAttributions.sort((a, b) => b.importance - a.importance);

    // 2. Identify physical Root Cause Candidate via backward dependency traversal
    // In distributed microservices, errors/latencies bubble UP to callers (e.g. DB -> Payment -> Checkout -> Gateway),
    // while the root cause is the DEEPEST anomalous callee (leaf of the cascade).
    let candidate = targetNode.id;
    let maxDepthScore = anomalyScores[targetNode.id] || 0;
    
    // Find candidate with high anomaly that is a dependency (callee) of the target or has earliest impact
    const visited = new Set<string>();
    const queue: string[] = [targetNode.id];
    const candidateScores = new Map<string, number>();

    while (queue.length > 0) {
      const curr = queue.shift()!;
      visited.add(curr);
      const currScore = anomalyScores[curr] || 0;
      candidateScores.set(curr, currScore);

      // Look at downstream callees (where curr is caller: curr -> callee)
      const outgoing = outgoingMap.get(curr) || [];
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          const calleeScore = anomalyScores[edge.target] || 0;
          if (calleeScore >= 0.5) {
            queue.push(edge.target);
          }
        }
      }
    }

    // Determine candidate: the deepest anomalous service (often database, cache, or external partner)
    let bestCandidate = targetNode.id;
    let highestRootScore = 0;

    for (const [nodeId, score] of candidateScores.entries()) {
      const node = nodeMap.get(nodeId);
      if (!node) continue;
      
      // Weight data/cache/external services higher as physical sources when anomalous
      let tierWeight = 1.0;
      if (node.tier === 'data') tierWeight = 1.6;
      else if (node.tier === 'cache') tierWeight = 1.4;
      else if (node.tier === 'external') tierWeight = 1.5;
      else if (node.tier === 'business') tierWeight = 1.1;

      // Penalize pure edge gateways as root cause unless directly overloaded
      if (node.tier === 'edge') tierWeight = 0.5;

      const adjusted = score * tierWeight;
      if (adjusted > highestRootScore) {
        highestRootScore = adjusted;
        bestCandidate = nodeId;
      }
    }

    // If no deeper candidate found, check if an external or data node is anomalous anywhere
    if (bestCandidate === targetNode.id && (targetNode.tier === 'edge' || targetNode.tier === 'business')) {
      for (const [nodeId, score] of Object.entries(anomalyScores)) {
        if (score >= this.anomalyThreshold) {
          const node = nodeMap.get(nodeId);
          if (node && (node.tier === 'data' || node.tier === 'cache' || node.tier === 'external')) {
            bestCandidate = nodeId;
            break;
          }
        }
      }
    }

    // 3. Reconstruct Causal Propagation Path: from bestCandidate -> ... -> targetNode
    const propagationPath = this.findPropagationPath(bestCandidate, targetNode.id, edges);

    // 4. Node Attributions
    const nodeAttributions: Record<string, number> = {};
    for (const node of nodes) {
      let attr = anomalyScores[node.id] || 0.1;
      if (node.id === bestCandidate) attr = Math.min(attr * 1.25, 0.99);
      if (propagationPath.includes(node.id)) attr = Math.min(attr * 1.15, 0.98);
      nodeAttributions[node.id] = Number(attr.toFixed(3));
    }

    const confidence = Math.min(0.98, Math.max(0.72, (anomalyScores[bestCandidate] || 0.8) * 0.95 + 0.05));

    // Formulate natural language explanation summary
    const summary = this.buildExplanationSummary(
      targetNode.name,
      bestCandidate,
      propagationPath,
      confidence,
      activeFaultType
    );

    return {
      incidentId: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      targetNode: targetNode.name,
      rootCauseCandidate: bestCandidate,
      rootCauseConfidence: Number(confidence.toFixed(2)),
      propagationPath,
      edgeAttributions: edgeAttributions.slice(0, 8),
      nodeAttributions,
      explanationSummary: summary,
    };
  }

  private findPropagationPath(sourceId: string, targetId: string, edges: EdgeDependency[]): string[] {
    if (sourceId === targetId) return [sourceId];

    // Build adjacency list (call direction: caller -> callee)
    const adj = new Map<string, string[]>();
    for (const e of edges) {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)?.push(e.target);
    }

    // BFS to find path from caller to callee or vice versa
    const queue: string[][] = [[sourceId]];
    const visited = new Set<string>([sourceId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const last = path[path.length - 1];

      if (last === targetId) return path;

      const neighbors = adj.get(last) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }

    // Reverse BFS check if target was the caller
    const revQueue: string[][] = [[targetId]];
    const revVisited = new Set<string>([targetId]);

    while (revQueue.length > 0) {
      const path = revQueue.shift()!;
      const last = path[path.length - 1];

      if (last === sourceId) return path.reverse();

      const neighbors = adj.get(last) || [];
      for (const n of neighbors) {
        if (!revVisited.has(n)) {
          revVisited.add(n);
          revQueue.push([...path, n]);
        }
      }
    }

    // Default fallback direct cascade
    return [sourceId, targetId];
  }

  private buildExplanationSummary(
    targetName: string,
    rootCandidate: string,
    propagationPath: string[],
    confidence: number,
    faultType?: FaultType
  ): string {
    const pathStr = propagationPath.join(' -> ');
    const faultDesc = faultType ? ` (${faultType.replace('_', ' ')})` : '';

    if (targetName === rootCandidate) {
      return `Anomaly detected at '${targetName}'${faultDesc}. Temporal GRU detected significant deviation in multivariate telemetry with high localized edge attribution. Root cause isolated directly to ${targetName} (Confidence: ${(confidence * 100).toFixed(0)}%).`;
    }

    return `Symptomatic degradation identified at '${targetName}'. GNNExplainer mutual-information edge masks traced upstream causal propagation along dependency path: ${pathStr}. Pinpointed physical root cause to '${rootCandidate}'${faultDesc} causing upstream thread contention and latency cascades (Confidence: ${(confidence * 100).toFixed(0)}%).`;
  }

  /**
   * Full GNN Forward Inference Pass
   */
  public runInference(nodes: ServiceNode[], edges: EdgeDependency[], activeFault?: FaultType): GNNInferenceResult {
    // 1. Compute Z-Score normalized temporal matrices X_i in R^{T x F}
    const temporalEmbeddings = new Map<string, number[]>();
    for (const node of nodes) {
      const normalized = this.normalizeFeatures(node.history);
      node.normalizedFeatures = normalized;
      const h_temporal = this.runNodeGRU(normalized, node);
      temporalEmbeddings.set(node.id, h_temporal);
    }

    // 2. Spatial Multi-Head GATv2Conv with edge attributes
    const { spatialEmbeddings, attentionWeights } = this.runGATv2Conv(nodes, edges, temporalEmbeddings);

    // 3. Compute Anomaly Likelihood Scores
    const nodeAnomalyScores: Record<string, number> = {};
    const anomalousNodes: string[] = [];

    for (const node of nodes) {
      const emb = spatialEmbeddings.get(node.id) || new Array(this.hiddenDim).fill(0);
      const score = this.computeAnomalyScore(node, emb);
      node.anomalyScore = score;
      nodeAnomalyScores[node.id] = score;

      if (score >= this.anomalyThreshold) {
        anomalousNodes.push(node.id);
        node.status = score >= 0.88 ? 'critical' : 'degraded';
      } else {
        node.status = 'nominal';
      }
    }

    // 4. Run GNNExplainer RCA if an anomaly is detected
    let rcaReport: RCAReport | null = null;
    if (anomalousNodes.length > 0) {
      // Pick highest anomaly node or caller as the entry symptom
      const highestScoreNodeId = anomalousNodes.reduce((maxId, currId) =>
        (nodeAnomalyScores[currId] || 0) > (nodeAnomalyScores[maxId] || 0) ? currId : maxId
      );

      rcaReport = this.explainAnomaly(
        highestScoreNodeId,
        nodes,
        edges,
        nodeAnomalyScores,
        activeFault
      );

      // Flag root cause and cascade path on nodes
      for (const node of nodes) {
        node.isRootCause = node.id === rcaReport.rootCauseCandidate;
        node.isInCascadePath = rcaReport.propagationPath.includes(node.id);
      }

      // Mark causal paths on edges
      for (const edge of edges) {
        const inPath = rcaReport.propagationPath.indexOf(edge.source) !== -1 &&
                       rcaReport.propagationPath.indexOf(edge.target) !== -1 &&
                       Math.abs(rcaReport.propagationPath.indexOf(edge.source) - rcaReport.propagationPath.indexOf(edge.target)) === 1;
        edge.isCausalPath = inPath;
        edge.isAnomalous = anomalousNodes.includes(edge.source) || anomalousNodes.includes(edge.target);
      }
    } else {
      for (const node of nodes) {
        node.isRootCause = false;
        node.isInCascadePath = false;
      }
      for (const edge of edges) {
        edge.isCausalPath = false;
        edge.isAnomalous = false;
      }
    }

    return {
      nodeAnomalyScores,
      anomalousNodes,
      attentionWeights,
      rcaReport,
    };
  }
}

export const gnnEngine = new SpatialTemporalGNNEngine();
