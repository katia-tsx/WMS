'use strict';

const { UseCaseDecorator } = require('./UseCaseDecorator');
const { Guard } = require('../../../domain/shared-kernel/guard/Guard');

const EXECUTIONS_COUNTER = 'use_case_executions_total';
const DURATION_HISTOGRAM = 'use_case_duration_seconds';

/**
 * MetricsUseCaseDecorator records, through an injected IMetricsRecorder,
 * how many times a use case ran (labeled by outcome — 'ok' or 'err') and
 * how long each execution took, so every use case gets consistent
 * observability without an `incrementCounter(...)` call inline in its
 * own `handle`. Two metrics, both labeled with `use_case` so they can be
 * broken down per use case in whatever reads them (see
 * infrastructure/observability/MetricsRegistry.js's Prometheus text
 * exposition):
 *
 *   use_case_executions_total{use_case="...", outcome="ok"|"err"}  (counter)
 *   use_case_duration_seconds{use_case="..."}                       (histogram)
 */
class MetricsUseCaseDecorator extends UseCaseDecorator {
  /**
   * @param {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }} innerUseCase
   * @param {Object} options
   * @param {import('../../ports/IMetricsRecorder').IMetricsRecorder} options.metricsRecorder
   * @param {string} [options.useCaseName] defaults to `innerUseCase.constructor.name`
   */
  constructor(innerUseCase, { metricsRecorder, useCaseName } = {}) {
    super(innerUseCase);
    Guard.againstNullOrUndefined(metricsRecorder, 'metricsRecorder');
    this.metricsRecorder = metricsRecorder;
    this.useCaseName = useCaseName ?? innerUseCase.constructor.name;
  }

  /**
   * @param {*} input
   * @returns {Promise<import('../../../domain/shared-kernel/result/Result').Result>}
   */
  async execute(input) {
    const startedAt = process.hrtime.bigint();
    const result = await super.execute(input);
    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;

    this.metricsRecorder.incrementCounter(EXECUTIONS_COUNTER, {
      use_case: this.useCaseName,
      outcome: result.isOk ? 'ok' : 'err',
    });
    this.metricsRecorder.observeHistogram(DURATION_HISTOGRAM, durationSeconds, { use_case: this.useCaseName });

    return result;
  }
}

module.exports = { MetricsUseCaseDecorator, EXECUTIONS_COUNTER, DURATION_HISTOGRAM };
