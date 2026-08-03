'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryLogger } = require('./InMemoryLogger');
const { runWithTraceId } = require('./CorrelationContext');

describe('InMemoryLogger', () => {
  test('records entries per level, in order', () => {
    const logger = new InMemoryLogger();
    const error = new Error('boom');

    logger.debug('debug msg');
    logger.info('info msg', { sku: 'ABC-123' });
    logger.warn('warn msg');
    logger.error('error msg', { sku: 'ABC-123' }, error);

    assert.deepEqual(
      logger.entries.map((e) => e.level),
      ['debug', 'info', 'warn', 'error'],
    );
    assert.equal(logger.entries[1].context.sku, 'ABC-123');
    assert.equal(logger.entries[3].error, error);
  });

  test('includes traceId in the recorded context when logged inside an active correlation context', () => {
    const logger = new InMemoryLogger();
    runWithTraceId('trace-1', () => logger.info('inside a request', { sku: 'ABC-123' }));
    assert.deepEqual(logger.entries[0].context, { traceId: 'trace-1', sku: 'ABC-123' });
  });
});
