'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { LoggingUseCaseDecorator } = require('./LoggingUseCaseDecorator');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { NotFoundError } = require('../../../domain/shared-kernel/errors/DomainError');

class RecordingLogger {
  constructor() {
    this.entries = [];
  }

  debug(message, context) {
    this.entries.push({ level: 'debug', message, context });
  }

  info(message, context) {
    this.entries.push({ level: 'info', message, context });
  }

  warn(message, context) {
    this.entries.push({ level: 'warn', message, context });
  }

  error(message, context, error) {
    this.entries.push({ level: 'error', message, context, error });
  }
}

describe('LoggingUseCaseDecorator', () => {
  test('logs a start entry, then a success entry, and passes through the Ok result', async () => {
    const logger = new RecordingLogger();
    const inner = { execute: async (input) => Result.ok(input) };
    const decorator = new LoggingUseCaseDecorator(inner, { logger, useCaseName: 'EchoUseCase' });

    const result = await decorator.execute({ sku: 'ABC-123' });

    assert.equal(result.isOk, true);
    assert.deepEqual(result.value, { sku: 'ABC-123' });
    assert.equal(logger.entries.length, 2);
    assert.equal(logger.entries[0].level, 'info');
    assert.equal(logger.entries[0].message, 'EchoUseCase started');
    assert.equal(logger.entries[1].level, 'info');
    assert.equal(logger.entries[1].message, 'EchoUseCase succeeded');
  });

  test('logs a warn entry on Result.err and still passes through the error', async () => {
    const logger = new RecordingLogger();
    const inner = { execute: async () => Result.err(new NotFoundError('No product found.')) };
    const decorator = new LoggingUseCaseDecorator(inner, { logger, useCaseName: 'AdjustStockUseCase' });

    const result = await decorator.execute({ sku: 'missing' });

    assert.equal(result.isErr, true);
    assert.ok(result.error instanceof NotFoundError);
    assert.equal(logger.entries[1].level, 'warn');
    assert.equal(logger.entries[1].message, 'AdjustStockUseCase failed');
    assert.equal(logger.entries[1].context.error.code, 'NOT_FOUND');
  });

  test('defaults useCaseName to the inner use case constructor name', async () => {
    const logger = new RecordingLogger();
    class SomeUseCase {
      async execute(input) {
        return Result.ok(input);
      }
    }
    const decorator = new LoggingUseCaseDecorator(new SomeUseCase(), { logger });

    await decorator.execute({});

    assert.equal(logger.entries[0].message, 'SomeUseCase started');
  });
});
