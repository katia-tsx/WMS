'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { UseCasePipelineBuilder } = require('./UseCasePipelineBuilder');
const { LoggingUseCaseDecorator } = require('./LoggingUseCaseDecorator');
const { AuthorizationUseCaseDecorator } = require('./AuthorizationUseCaseDecorator');
const { TransactionalUseCaseDecorator } = require('./TransactionalUseCaseDecorator');
const { MetricsUseCaseDecorator } = require('./MetricsUseCaseDecorator');
const { Result } = require('../../../domain/shared-kernel/result/Result');

class RecordingLogger {
  constructor() {
    this.entries = [];
  }
  debug(message, context) { this.entries.push({ level: 'debug', message, context }); }
  info(message, context) { this.entries.push({ level: 'info', message, context }); }
  warn(message, context) { this.entries.push({ level: 'warn', message, context }); }
  error(message, context, error) { this.entries.push({ level: 'error', message, context, error }); }
}

class RecordingUnitOfWork {
  constructor() {
    this.calls = [];
  }
  async begin() { this.calls.push('begin'); }
  async commit() { this.calls.push('commit'); }
  async rollback() { this.calls.push('rollback'); }
}

class RecordingMetricsRecorder {
  constructor() {
    this.counters = [];
  }
  incrementCounter(name, labels) { this.counters.push({ name, labels }); }
  observeHistogram() {}
}

describe('UseCasePipelineBuilder', () => {
  test('build() with no decorators returns the original use case', () => {
    const useCase = { execute: async (input) => Result.ok(input) };
    const built = new UseCasePipelineBuilder(useCase).build();
    assert.equal(built, useCase);
  });

  test('each withX() wraps the previous result, and build() returns the outermost layer', () => {
    const useCase = { execute: async (input) => Result.ok(input) };
    const logger = new RecordingLogger();
    const unitOfWork = new RecordingUnitOfWork();

    const built = new UseCasePipelineBuilder(useCase)
      .withTransaction(unitOfWork)
      .withAuthorization(() => true)
      .withLogging(logger)
      .build();

    assert.ok(built instanceof LoggingUseCaseDecorator);
    assert.ok(built.innerUseCase instanceof AuthorizationUseCaseDecorator);
    assert.ok(built.innerUseCase.innerUseCase instanceof TransactionalUseCaseDecorator);
    assert.equal(built.innerUseCase.innerUseCase.innerUseCase, useCase);
  });

  test('recommended order — transaction innermost, authorization, logging outermost — runs each concern exactly once, in the right sequence', async () => {
    const logger = new RecordingLogger();
    const unitOfWork = new RecordingUnitOfWork();
    const useCase = { execute: async (input) => Result.ok(input) };

    const pipeline = new UseCasePipelineBuilder(useCase)
      .withTransaction(unitOfWork)
      .withAuthorization(() => true)
      .withLogging(logger, 'DemoUseCase')
      .build();

    const result = await pipeline.execute({ sku: 'ABC-123' });

    assert.equal(result.isOk, true);
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
    assert.equal(logger.entries[0].message, 'DemoUseCase started');
    assert.equal(logger.entries[1].message, 'DemoUseCase succeeded');
  });

  test('a denial never opens a transaction, because authorization sits outside it', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const useCase = { execute: async (input) => Result.ok(input) };

    const pipeline = new UseCasePipelineBuilder(useCase)
      .withTransaction(unitOfWork)
      .withAuthorization(() => false, 'DemoUseCase')
      .build();

    const result = await pipeline.execute({});

    assert.equal(result.isErr, true);
    assert.deepEqual(unitOfWork.calls, []);
  });

  test('withMetrics wraps in a MetricsUseCaseDecorator, and records even a denial when placed outside authorization', async () => {
    const metricsRecorder = new RecordingMetricsRecorder();
    const useCase = { execute: async (input) => Result.ok(input) };

    const built = new UseCasePipelineBuilder(useCase).withMetrics(metricsRecorder, 'DemoUseCase').build();
    assert.ok(built instanceof MetricsUseCaseDecorator);

    const pipeline = new UseCasePipelineBuilder(useCase)
      .withAuthorization(() => false, 'DemoUseCase')
      .withMetrics(metricsRecorder, 'DemoUseCase')
      .build();

    const result = await pipeline.execute({});

    assert.equal(result.isErr, true);
    assert.deepEqual(metricsRecorder.counters, [
      { name: 'use_case_executions_total', labels: { use_case: 'DemoUseCase', outcome: 'err' } },
    ]);
  });
});
