'use strict';

const { Port } = require('./Port');

/**
 * IMetricsRecorder — outbound port for recording metrics (a counter of
 * how many times something happened, a histogram of how long something
 * took), without the application layer knowing whether they end up
 * printed, exported as Prometheus text (see
 * infrastructure/observability/MetricsRegistry.js), or shipped to a
 * hosted APM. Kept to exactly two generic operations — the same
 * "narrow, structural port" shape as `IEventPublisher#publish` — rather
 * than a method per named metric, so adding a new metric never means
 * touching this port.
 *
 * `name` should be a stable, low-cardinality identifier (e.g.
 * `'use_case_executions_total'`); `labels` should have a small, bounded
 * set of possible values per key (a use case name, an outcome) — never
 * anything containing a request id, a user id, or other unbounded value,
 * which would make the underlying series count grow without limit.
 *
 * @interface
 */
class IMetricsRecorder extends Port {
  /**
   * Pre:  `name` identifies a counter; `labels` (if given) is a flat
   *       object of string/number values.
   * Post: the named counter, for that exact combination of labels, has
   *       been incremented by 1. A counter never decreases and never
   *       accepts an arbitrary delta — that is what distinguishes it
   *       from a gauge, which this port does not model (not needed yet).
   *
   * @param {string} name
   * @param {Object<string, string|number>} [labels]
   * @returns {void}
   */
  incrementCounter(name, labels) {
    this._abstract('incrementCounter');
  }

  /**
   * Pre:  `name` identifies a histogram; `value` is the measurement for
   *       one occurrence (e.g. a duration in seconds); `labels` as above.
   * Post: `value` has been recorded against every bucket boundary it
   *       falls under, and against that histogram's running sum/count,
   *       for that exact combination of labels.
   *
   * @param {string} name
   * @param {number} value
   * @param {Object<string, string|number>} [labels]
   * @returns {void}
   */
  observeHistogram(name, value, labels) {
    this._abstract('observeHistogram');
  }
}

module.exports = { IMetricsRecorder };
