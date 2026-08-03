'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ILogger } = require('./ILogger');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('ILogger (base contract)', () => {
  test('every level throws NotImplementedError when not overridden', () => {
    const logger = new ILogger();
    assert.throws(() => logger.debug('msg'), NotImplementedError);
    assert.throws(() => logger.info('msg'), NotImplementedError);
    assert.throws(() => logger.warn('msg'), NotImplementedError);
    assert.throws(() => logger.error('msg', {}, new Error('boom')), NotImplementedError);
  });
});

describe('ILogger (fake adapter)', () => {
  class RecordingLogger extends ILogger {
    constructor() {
      super();
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

  test('records structured entries per level', () => {
    const logger = new RecordingLogger();
    logger.info('stock adjusted', { sku: 'ABC-123' });
    assert.deepEqual(logger.entries, [{ level: 'info', message: 'stock adjusted', context: { sku: 'ABC-123' } }]);
  });
});
