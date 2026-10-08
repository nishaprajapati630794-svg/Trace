import { GoogleGenAI } from '@google/genai';
import { RCAReport } from '../types/telemetry';

export async function generateIncidentPlaybook(rca: RCAReport, apiKey?: string): Promise<string> {
  const key = apiKey || (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) || '';

  const prompt = `You are a Principal Reliability & Distributed Systems Engineer specialized in Graph Neural Networks, OpenTelemetry, and Kubernetes Microservices.

Analyze the following Real-Time GNN Root Cause Analysis (RCA) incident:
- Incident ID: ${rca.incidentId}
- Symptom Node (where error/latency was detected): ${rca.targetNode}
- Pinpointed Physical Root Cause (isolated by GNNExplainer): ${rca.rootCauseCandidate}
- Root Cause Confidence: ${(rca.rootCauseConfidence * 100).toFixed(1)}%
- Causal Propagation Cascade Path: ${rca.propagationPath.join(' -> ')}
- GNN Explanation: ${rca.explanationSummary}
- High-Importance Attributed Edges:
${rca.edgeAttributions.slice(0, 4).map((e) => `  * ${e.source} -> ${e.target} (importance: ${e.importance}, latency: ${e.latencyMs}ms, error_rate: ${(e.errorRate * 100).toFixed(1)}%)`).join('\n')}

Provide an ultra-crisp, production-grade DevOps remediation report with:
1. Executive Incident Summary (2-3 sentences explaining why the root cause misled traditional alerting tools).
2. Immediate Mitigation Actions (concrete bash / kubectl / psql commands or configuration fixes).
3. Circuit Breaker & Connection Pool Architecture Safeguards.
4. Long-Term Architectural Prevention (GNN threshold tuning, dead-letter queues, read-replica offloading).
Keep the response tightly structured, technical, and formatted in clean markdown.`;

  if (key && key !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      console.warn('Gemini API call returned error or was unavailable, using high-fidelity fallback playbook:', err);
    }
  }

  // High-fidelity fallback engineering playbook based on root-cause candidate
  return generateDeterministicPlaybook(rca);
}

function generateDeterministicPlaybook(rca: RCAReport): string {
  const root = rca.rootCauseCandidate;
  const isDb = root.includes('db') || root.includes('postgres');
  const isCache = root.includes('redis') || root.includes('cache');
  const isExternal = root.includes('stripe') || root.includes('external');

  let mitigationCommands = '';
  let architecturalSafeguard = '';

  if (isDb) {
    mitigationCommands = `\`\`\`bash
# 1. Inspect PostgreSQL active queries and lock contention
kubectl exec -it deployment/db-cluster-primary -n prod -- psql -U postgres -d app_db -c "
SELECT pid, age(clock_timestamp(), query_start), usename, query, state 
FROM pg_stat_activity 
WHERE state != 'idle' AND query_start < now() - interval '5 seconds' 
ORDER BY query_start ASC LIMIT 10;"

# 2. Terminate blocking PID or slow transaction
kubectl exec -it deployment/db-cluster-primary -n prod -- psql -U postgres -d app_db -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'active' AND query ILIKE '%pg_advisory_xact_lock%' AND pid <> pg_backend_pid();"

# 3. Scale read replicas & tune PgBouncer connection pool limits
kubectl scale deployment/db-cluster-replica --replicas=4 -n prod
kubectl set env deployment/payment-service DB_MAX_OPEN_CONNS=150 DB_CONN_MAX_LIFETIME=5m -n prod
\`\`\``;
    architecturalSafeguard = `- **Connection Pool Isolation**: Enforce bulkhead connection pools between checkout reads and payment writes.\n- **Read-Replica Routing**: Route catalog and profile read traffic away from the write primary.\n- **Statement Timeouts**: Set \`SET statement_timeout = '3000ms';\` to prevent worker thread starvation.`;
  } else if (isCache) {
    mitigationCommands = `\`\`\`bash
# 1. Check Redis memory fragmentation and slow log
kubectl exec -it deployment/redis-cluster-m01 -n prod -- redis-cli SLOWLOG GET 10
kubectl exec -it deployment/redis-cluster-m01 -n prod -- redis-cli INFO memory

# 2. Adjust maxmemory policy to volatile-lru and expand pod limits
kubectl exec -it deployment/redis-cluster-m01 -n prod -- redis-cli CONFIG SET maxmemory-policy allkeys-lru
kubectl patch deployment/redis-cluster-m01 -p '{"spec":{"template":{"spec":{"containers":[{"name":"redis","resources":{"limits":{"memory":"4Gi"}}}]}}}}'
\`\`\``;
    architecturalSafeguard = `- **Cache Stasis Prevention**: Implement jittered TTLs to prevent stampedes.\n- **Local Fallback**: Enable 5-second in-memory LRU fallback in caller services during cache degradation.`;
  } else if (isExternal) {
    mitigationCommands = `\`\`\`bash
# 1. Trip Istio / Envoy Circuit Breaker on external-stripe-gw egress
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: stripe-egress-circuit-breaker
spec:
  host: api.stripe.com
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
EOF
\`\`\``;
    architecturalSafeguard = `- **Asynchronous Webhook Settlement**: Fall back to asynchronous two-phase queue settlement rather than blocking synchronous HTTP RPC.\n- **Exponential Backoff**: Set 1.5s jittered backoff on payment retries.`;
  } else {
    mitigationCommands = `\`\`\`bash
# 1. Restart degraded worker pod with zero downtime rollout
kubectl rollout restart deployment/${root} -n prod
kubectl wait --for=condition=available --timeout=60s deployment/${root} -n prod

# 2. Horizontally autoscale target service
kubectl autoscale deployment/${root} --cpu-percent=70 --min=3 --max=10 -n prod
\`\`\``;
    architecturalSafeguard = `- **Bulkhead Pattern**: Isolate microservice thread pools to contain cascade propagation.\n- **Rate Limiting**: Enforce Token Bucket rate limiting at \`api-gateway\` level.`;
  }

  return `### Executive Incident Summary
An anomalous telemetry pattern emerged at **${rca.targetNode}**, but the Spatial-Temporal GNN with GNNExplainer successfully discerned that **${rca.targetNode}** was merely a victim of an upstream cascade. The genuine physical root cause was pinpointed to **\`${root}\`** with **${(rca.rootCauseConfidence * 100).toFixed(0)}% confidence**.

**Causal Propagation Cascade:**
\`${rca.propagationPath.join(' ➔ ')}\`

---

### Immediate Mitigation Actions
Execute the following remediation operations:

${mitigationCommands}

---

### Architectural Safeguards & Circuit Breakers
${architecturalSafeguard}

---

### Long-Term Prevention
1. **ST-GNN Adaptive Baseline**: Maintain continuous Z-score window normalization to automatically adjust for peak shopping traffic.
2. **OpenTelemetry Context Propagation**: Ensure W3C \`traceparent\` headers are preserved across all gRPC and asynchronous Kafka event publishers.
3. **Dead-Letter Queue Re-drive**: Offload deferred payment notifications to Kafka DLQ to unblock synchronous checkout latency.`;
}
