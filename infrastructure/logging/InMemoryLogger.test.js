'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { InMemoryLogger } = require('./InMemoryLogger');

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
});
