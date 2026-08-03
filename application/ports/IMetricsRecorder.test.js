'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IMetricsRecorder } = require('./IMetricsRecorder');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('IMetricsRecorder (base contract)', () => {
  test('incrementCounter throws NotImplementedError when not overridden', () => {
    const recorder = new IMetricsRecorder();
    assert.throws(() => recorder.incrementCounter('use_case_executions_total', { use_case: 'X' }), NotImplementedError);
  });

  test('observeHistogram throws NotImplementedError when not overridden', () => {
    const recorder = new IMetricsRecorder();
    assert.throws(() => recorder.observeHistogram('use_case_duration_seconds', 0.5), NotImplementedError);
  });
});

describe('IMetricsRecorder (fake adapter)', () => {
  class RecordingMetricsRecorder extends IMetricsRecorder {
    constructor() {
      super();
      this.counters = [];
      this.histogramObservations = [];
    }

    incrementCounter(name, labels = {}) {
      this.counters.push({ name, labels });
    }

    observeHistogram(name, value, labels = {}) {
      this.histogramObservations.push({ name, value, labels });
    }
  }

  test('a fake adapter records what a use case decorator would report', () => {
    const recorder = new RecordingMetricsRecorder();
    recorder.incrementCounter('use_case_executions_total', { use_case: 'AdjustStockUseCase', outcome: 'ok' });
    recorder.observeHistogram('use_case_duration_seconds', 0.042, { use_case: 'AdjustStockUseCase' });

    assert.deepEqual(recorder.counters, [
      { name: 'use_case_executions_total', labels: { use_case: 'AdjustStockUseCase', outcome: 'ok' } },
    ]);
    assert.deepEqual(recorder.histogramObservations, [
      { name: 'use_case_duration_seconds', value: 0.042, labels: { use_case: 'AdjustStockUseCase' } },
    ]);
  });
});
