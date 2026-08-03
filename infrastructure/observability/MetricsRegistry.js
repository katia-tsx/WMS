'use strict';

/** Reasonable default bucket boundaries (seconds) for HTTP/use-case latency — sub-5ms up to 10s. */
const DEFAULT_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * @param {Object<string, string|number>} labels
 * @returns {string} a stable key so the same label combination always maps to the same series, regardless of key insertion order
 */
function labelsKey(labels) {
  return Object.keys(labels)
    .sort()
    .map((key) => `${key}=${JSON.stringify(String(labels[key]))}`)
    .join(',');
}

/**
 * @param {Object<string, string|number>} labels
 * @returns {string} Prometheus text exposition's `{k="v",...}` suffix, or
 *   '' for no labels. Keys are sorted, the same as `labelsKey`, so
 *   rendering is deterministic regardless of the order a caller happened
 *   to build the labels object in.
 */
function formatLabels(labels) {
  const keys = Object.keys(labels).sort();
  if (keys.length === 0) return '';
  const pairs = keys.map((key) => `${key}="${String(labels[key]).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  return `{${pairs.join(',')}}`;
}

/**
 * MetricsRegistry is the concrete `IMetricsRecorder` this app uses in
 * every mode: an in-process counter/histogram store with no export
 * dependency (no `prom-client`) that renders itself as Prometheus text
 * exposition format on demand (`toPrometheusText`, served at `GET
 * /metrics` — see infrastructure/adapters/http/routes.js). A single
 * shared instance, registered once in
 * infrastructure/di/CompositionRoot.js, is handed to
 * `MetricsUseCaseDecorator` (use-case counters/duration) and to
 * `Router` (HTTP request duration) alike, so both report into the same
 * registry.
 *
 * Deliberately minimal: two metric kinds (counter, histogram — no gauge,
 * no summary/quantiles), no persistence across restarts, and no
 * remote-write. That's the explicit tradeoff of "lay groundwork ...
 * without introducing a heavy APM dependency at this stage" — swap this
 * for `prom-client` (or push to a real backend) later without touching
 * `IMetricsRecorder` callers, the same way any other port's adapter can
 * be swapped.
 *
 * @implements {import('../../application/ports/IMetricsRecorder').IMetricsRecorder}
 */
class MetricsRegistry {
  constructor() {
    /** @type {Map<string, { help: string, series: Map<string, {labels: Object, value: number}> }>} */
    this._counters = new Map();
    /** @type {Map<string, { help: string, buckets: number[], series: Map<string, {labels: Object, bucketCounts: number[], sum: number, count: number}> }>} */
    this._histograms = new Map();
  }

  /**
   * @param {string} name
   * @param {string} [help]
   * @returns {MetricsRegistry}
   */
  registerCounter(name, help = name) {
    if (!this._counters.has(name)) {
      this._counters.set(name, { help, series: new Map() });
    }
    return this;
  }

  /**
   * @param {string} name
   * @param {string} [help]
   * @param {number[]} [buckets]
   * @returns {MetricsRegistry}
   */
  registerHistogram(name, help = name, buckets = DEFAULT_DURATION_BUCKETS) {
    if (!this._histograms.has(name)) {
      this._histograms.set(name, { help, buckets: [...buckets].sort((a, b) => a - b), series: new Map() });
    }
    return this;
  }

  /**
   * @param {string} name
   * @param {Object<string, string|number>} [labels]
   */
  incrementCounter(name, labels = {}) {
    this.registerCounter(name);
    const metric = this._counters.get(name);
    const key = labelsKey(labels);
    const series = metric.series.get(key);
    if (series) series.value += 1;
    else metric.series.set(key, { labels, value: 1 });
  }

  /**
   * @param {string} name
   * @param {number} value
   * @param {Object<string, string|number>} [labels]
   */
  observeHistogram(name, value, labels = {}) {
    this.registerHistogram(name);
    const metric = this._histograms.get(name);
    const key = labelsKey(labels);
    let series = metric.series.get(key);
    if (!series) {
      series = { labels, bucketCounts: metric.buckets.map(() => 0), sum: 0, count: 0 };
      metric.series.set(key, series);
    }
    // Cumulative by construction: every bucket whose boundary the value
    // falls at-or-under gets incremented, so a higher bucket's count
    // always includes every lower bucket's observations too — exactly
    // Prometheus's "le" (less-than-or-equal) histogram semantics.
    metric.buckets.forEach((bound, index) => {
      if (value <= bound) series.bucketCounts[index] += 1;
    });
    series.sum += value;
    series.count += 1;
  }

  /**
   * @returns {string} the full registry rendered as Prometheus text
   *   exposition format (one `# HELP`/`# TYPE` pair per metric, one
   *   line per label combination).
   */
  toPrometheusText() {
    const lines = [];

    for (const [name, metric] of this._counters) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} counter`);
      for (const series of metric.series.values()) {
        lines.push(`${name}${formatLabels(series.labels)} ${series.value}`);
      }
    }

    for (const [name, metric] of this._histograms) {
      lines.push(`# HELP ${name} ${metric.help}`);
      lines.push(`# TYPE ${name} histogram`);
      for (const series of metric.series.values()) {
        metric.buckets.forEach((bound, index) => {
          lines.push(`${name}_bucket${formatLabels({ ...series.labels, le: bound })} ${series.bucketCounts[index]}`);
        });
        lines.push(`${name}_bucket${formatLabels({ ...series.labels, le: '+Inf' })} ${series.count}`);
        lines.push(`${name}_sum${formatLabels(series.labels)} ${series.sum}`);
        lines.push(`${name}_count${formatLabels(series.labels)} ${series.count}`);
      }
    }

    return lines.length > 0 ? `${lines.join('\n')}\n` : '';
  }
}

module.exports = { MetricsRegistry, DEFAULT_DURATION_BUCKETS };
