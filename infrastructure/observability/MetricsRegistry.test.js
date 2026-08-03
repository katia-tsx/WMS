'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { MetricsRegistry } = require('./MetricsRegistry');

describe('MetricsRegistry — counters', () => {
  test('incrementCounter starts a new series at 1 and increments it on repeat calls', () => {
    const registry = new MetricsRegistry();
    registry.incrementCounter('use_case_executions_total', { use_case: 'X', outcome: 'ok' });
    registry.incrementCounter('use_case_executions_total', { use_case: 'X', outcome: 'ok' });
    registry.incrementCounter('use_case_executions_total', { use_case: 'X', outcome: 'ok' });

    const text = registry.toPrometheusText();
    assert.match(text, /use_case_executions_total\{outcome="ok",use_case="X"\} 3/);
  });

  test('different label combinations are tracked as separate series', () => {
    const registry = new MetricsRegistry();
    registry.incrementCounter('use_case_executions_total', { use_case: 'X', outcome: 'ok' });
    registry.incrementCounter('use_case_executions_total', { use_case: 'X', outcome: 'err' });
    registry.incrementCounter('use_case_executions_total', { use_case: 'Y', outcome: 'ok' });

    const text = registry.toPrometheusText();
    assert.match(text, /use_case_executions_total\{outcome="ok",use_case="X"\} 1/);
    assert.match(text, /use_case_executions_total\{outcome="err",use_case="X"\} 1/);
    assert.match(text, /use_case_executions_total\{outcome="ok",use_case="Y"\} 1/);
  });

  test('label key order does not create a new series', () => {
    const registry = new MetricsRegistry();
    registry.incrementCounter('c', { a: '1', b: '2' });
    registry.incrementCounter('c', { b: '2', a: '1' });
    const text = registry.toPrometheusText();
    assert.match(text, /^c\{a="1",b="2"\} 2$/m);
  });

  test('a counter with no labels renders with no {} suffix', () => {
    const registry = new MetricsRegistry();
    registry.incrementCounter('requests_total');
    const text = registry.toPrometheusText();
    assert.match(text, /^requests_total 1$/m);
  });

  test('renders # HELP and # TYPE lines', () => {
    const registry = new MetricsRegistry();
    registry.registerCounter('use_case_executions_total', 'Total use case executions');
    registry.incrementCounter('use_case_executions_total', { use_case: 'X' });
    const text = registry.toPrometheusText();
    assert.match(text, /# HELP use_case_executions_total Total use case executions/);
    assert.match(text, /# TYPE use_case_executions_total counter/);
  });
});

describe('MetricsRegistry — histograms', () => {
  test('bucket counts are cumulative ("le" semantics): a value counts toward every bucket at or above it', () => {
    const registry = new MetricsRegistry();
    registry.registerHistogram('http_request_duration_seconds', 'HTTP request duration', [0.1, 0.5, 1]);
    registry.observeHistogram('http_request_duration_seconds', 0.3, { route: '/x' });

    const text = registry.toPrometheusText();
    assert.match(text, /http_request_duration_seconds_bucket\{le="0\.1",route="\/x"\} 0/);
    assert.match(text, /http_request_duration_seconds_bucket\{le="0\.5",route="\/x"\} 1/);
    assert.match(text, /http_request_duration_seconds_bucket\{le="1",route="\/x"\} 1/);
    assert.match(text, /http_request_duration_seconds_bucket\{le="\+Inf",route="\/x"\} 1/);
  });

  test('sum and count accumulate across multiple observations in the same series', () => {
    const registry = new MetricsRegistry();
    registry.registerHistogram('d', 'd', [1, 10]);
    registry.observeHistogram('d', 0.2, { route: '/x' });
    registry.observeHistogram('d', 0.3, { route: '/x' });

    const text = registry.toPrometheusText();
    assert.match(text, /d_sum\{route="\/x"\} 0\.5/);
    assert.match(text, /d_count\{route="\/x"\} 2/);
  });

  test('a value larger than every finite bucket only counts toward +Inf', () => {
    const registry = new MetricsRegistry();
    registry.registerHistogram('d', 'd', [0.1, 0.5]);
    registry.observeHistogram('d', 999, {});

    const text = registry.toPrometheusText();
    assert.match(text, /d_bucket\{le="0\.1"\} 0/);
    assert.match(text, /d_bucket\{le="0\.5"\} 0/);
    assert.match(text, /d_bucket\{le="\+Inf"\} 1/);
  });

  test('different label combinations are tracked as separate histogram series', () => {
    const registry = new MetricsRegistry();
    registry.registerHistogram('d', 'd', [1]);
    registry.observeHistogram('d', 0.5, { route: '/a' });
    registry.observeHistogram('d', 0.5, { route: '/b' });

    const text = registry.toPrometheusText();
    assert.match(text, /d_count\{route="\/a"\} 1/);
    assert.match(text, /d_count\{route="\/b"\} 1/);
  });

  test('renders # HELP and # TYPE lines for histograms', () => {
    const registry = new MetricsRegistry();
    registry.registerHistogram('h', 'A histogram', [1]);
    registry.observeHistogram('h', 0.1);
    const text = registry.toPrometheusText();
    assert.match(text, /# HELP h A histogram/);
    assert.match(text, /# TYPE h histogram/);
  });
});

describe('MetricsRegistry — implements IMetricsRecorder structurally', () => {
  test('satisfies the IMetricsRecorder shape used by MetricsUseCaseDecorator', async () => {
    const { MetricsUseCaseDecorator } = require('../../application/use-cases/decorators/MetricsUseCaseDecorator');
    const { Result } = require('../../domain/shared-kernel/result/Result');

    const registry = new MetricsRegistry();
    const inner = { execute: async (input) => Result.ok(input) };
    const decorated = new MetricsUseCaseDecorator(inner, { metricsRecorder: registry, useCaseName: 'X' });

    await decorated.execute({});

    const text = registry.toPrometheusText();
    assert.match(text, /use_case_executions_total\{outcome="ok",use_case="X"\} 1/);
  });
});

describe('MetricsRegistry — empty registry', () => {
  test('toPrometheusText() on an empty registry returns an empty string', () => {
    assert.equal(new MetricsRegistry().toPrometheusText(), '');
  });
});
