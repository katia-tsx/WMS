'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ConsoleLogger } = require('./ConsoleLogger');

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
});
