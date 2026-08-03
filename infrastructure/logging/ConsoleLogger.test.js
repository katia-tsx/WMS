'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ConsoleLogger } = require('./ConsoleLogger');
const { runWithTraceId } = require('./CorrelationContext');

describe('ConsoleLogger', () => {
  test('every level runs without throwing, with or without context/error', () => {
    const logger = new ConsoleLogger();
    assert.doesNotThrow(() => {
      logger.debug('debug msg');
      logger.info('info msg', { sku: 'ABC-123' });
      logger.warn('warn msg');
      logger.error('error msg', { sku: 'ABC-123' }, new Error('boom'));
      logger.error('error msg with no context or error');
    });
  });

  test('includes traceId in the printed context when logged inside an active correlation context', () => {
    const logger = new ConsoleLogger();
    let printedContext;
    const originalLog = console.log;
    console.log = (message, context) => { printedContext = context; };
    try {
      runWithTraceId('trace-1', () => logger.info('inside a request', { sku: 'ABC-123' }));
    } finally {
      console.log = originalLog;
    }
    assert.deepEqual(printedContext, { traceId: 'trace-1', sku: 'ABC-123' });
  });
});
