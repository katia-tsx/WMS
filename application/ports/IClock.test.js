'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IClock } = require('./IClock');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('IClock (base contract)', () => {
  test('now() throws NotImplementedError when not overridden', () => {
    const clock = new IClock();
    assert.throws(() => clock.now(), NotImplementedError);
  });
});

describe('IClock (fake adapter)', () => {
  class FrozenClock extends IClock {
    constructor(instant) {
      super();
      this.instant = instant;
    }

    now() {
      return this.instant;
    }
  }

  test('a frozen fake clock returns the same instant on every call, for deterministic tests', () => {
    const frozenInstant = new Date('2026-01-01T00:00:00.000Z');
    const clock = new FrozenClock(frozenInstant);
    assert.equal(clock.now(), frozenInstant);
    assert.equal(clock.now(), frozenInstant);
  });
});
