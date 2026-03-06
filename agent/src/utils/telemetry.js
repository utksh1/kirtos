class Telemetry {
  constructor() {
    this.metrics = new Map();
  }

  record(intent, data) {
    if (!this.metrics.has(intent)) {
      this.metrics.set(intent, { success: 0, failure: 0, latencies: [], queueWaits: [] });
    }
    const m = this.metrics.get(intent);
    if (data.status === 'success' || data.status === 'partial_success') {
      m.success++;
    } else {
      m.failure++;
    }
    if (data.duration !== undefined) m.latencies.push(data.duration);
    if (data.queueWait !== undefined) m.queueWaits.push(data.queueWait);


    if (m.latencies.length > 100) m.latencies.shift();
    if (m.queueWaits.length > 100) m.queueWaits.shift();
  }

  getSummary() {
    const summary = {};
    for (const [intent, m] of this.metrics.entries()) {
      const avgLatency = m.latencies.length > 0 ?
      m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length :
      0;
      const p95Latency = m.latencies.length > 0 ?
      m.latencies.sort((a, b) => a - b)[Math.floor(m.latencies.length * 0.95)] :
      0;

      summary[intent] = {
        success_rate: m.success / (m.success + m.failure || 1),
        avg_latency_ms: Math.round(avgLatency),
        p95_latency_ms: Math.round(p95Latency),
        total_runs: m.success + m.failure
      };
    }
    return summary;
  }
}

module.exports = new Telemetry();