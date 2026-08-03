'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { MetricsUseCaseDecorator, EXECUTIONS_COUNTER, DURATION_HISTOGRAM } = require('./MetricsUseCaseDecorator');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { BusinessRuleViolationError } = require('../../../domain/shared-kernel/errors/DomainError');

class RecordingMetricsRecorder {
  constructor() {
    this.counters = [];
    this.histogramObservations = [];
  }
  incrementCounter(name, labels) { this.counters.push({ name, labels }); }
  observeHistogram(name, value, labels) { this.histogramObservations.push({ name, value, labels }); }
}

describe('MetricsUseCaseDecorator', () => {
  test('increments the executions counter with outcome "ok" and observes a duration on success', async () => {
    const metricsRecorder = new RecordingMetricsRecorder();
    const inner = { execute: async (input) => Result.ok(input) };
    const decorator = new MetricsUseCaseDecorator(inner, { metricsRecorder, useCaseName: 'AdjustStockUseCase' });

    const result = await decorator.execute({ sku: 'ABC-123' });

    assert.equal(result.isOk, true);
    assert.deepEqual(metricsRecorder.counters, [
      { name: EXECUTIONS_COUNTER, labels: { use_case: 'AdjustStockUseCase', outcome: 'ok' } },
    ]);
    assert.equal(metricsRecorder.histogramObservations.length, 1);
    assert.equal(metricsRecorder.histogramObservations[0].name, DURATION_HISTOGRAM);
    assert.deepEqual(metricsRecorder.histogramObservations[0].labels, { use_case: 'AdjustStockUseCase' });
    assert.ok(metricsRecorder.histogramObservations[0].value >= 0);
  });

  test('increments the executions counter with outcome "err" on a Result.err, still observing a duration', async () => {
    const metricsRecorder = new RecordingMetricsRecorder();
    const inner = { execute: async () => Result.err(new BusinessRuleViolationError('nope')) };
    const decorator = new MetricsUseCaseDecorator(inner, { metricsRecorder, useCaseName: 'AdjustStockUseCase' });

    const result = await decorator.execute({});

    assert.equal(result.isErr, true);
    assert.deepEqual(metricsRecorder.counters, [
      { name: EXECUTIONS_COUNTER, labels: { use_case: 'AdjustStockUseCase', outcome: 'err' } },
    ]);
    assert.equal(metricsRecorder.histogramObservations.length, 1);
  });

  test('defaults useCaseName to the inner use case\'s constructor name', async () => {
    const metricsRecorder = new RecordingMetricsRecorder();
    class SomeUseCase {
      async execute(input) { return Result.ok(input); }
    }
    const decorator = new MetricsUseCaseDecorator(new SomeUseCase(), { metricsRecorder });

    await decorator.execute({});

    assert.equal(metricsRecorder.counters[0].labels.use_case, 'SomeUseCase');
  });

  test('propagates a thrown (programmer) error without recording metrics for it', async () => {
    const metricsRecorder = new RecordingMetricsRecorder();
    const inner = { execute: async () => { throw new TypeError('boom'); } };
    const decorator = new MetricsUseCaseDecorator(inner, { metricsRecorder, useCaseName: 'X' });

    await assert.rejects(() => decorator.execute({}), TypeError);
    assert.deepEqual(metricsRecorder.counters, []);
    assert.deepEqual(metricsRecorder.histogramObservations, []);
  });
});
