class LatencyStats {
  constructor(windowSize = 100) {
    this.windowSize = windowSize;
    this.data = {};
  }

  record(intent, duration) {
    if (!this.data[intent]) {
      this.data[intent] = [];
    }
    this.data[intent].push(duration);
    if (this.data[intent].length > this.windowSize) {
      this.data[intent].shift();
    }
  }

  getPercentile(intent, percentile) {
    const values = this.data[intent];
    if (!values || values.length < 5) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(percentile / 100 * sorted.length) - 1;
    return sorted[index];
  }

  getRecommendedTimeout(intent, defaultTimeout) {
    const p95 = this.getPercentile(intent, 95);
    if (!p95) return defaultTimeout;


    const recommended = Math.ceil(p95 * 1.2);
    return Math.min(recommended, Math.max(defaultTimeout * 2, 60000));
  }
}

module.exports = new LatencyStats();