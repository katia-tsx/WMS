'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { IUnitOfWork } = require('./IUnitOfWork');
const { NotImplementedError } = require('./errors/NotImplementedError');

describe('IUnitOfWork (base contract)', () => {
  test('begin/commit/rollback all reject with NotImplementedError when not overridden', async () => {
    const unitOfWork = new IUnitOfWork();
    await assert.rejects(() => unitOfWork.begin(), NotImplementedError);
    await assert.rejects(() => unitOfWork.commit(), NotImplementedError);
    await assert.rejects(() => unitOfWork.rollback(), NotImplementedError);
  });
});

describe('IUnitOfWork (fake adapter)', () => {
  class NoOpUnitOfWork extends IUnitOfWork {
    constructor() {
      super();
      this.calls = [];
    }

    async begin() {
      this.calls.push('begin');
    }

    async commit() {
      this.calls.push('commit');
    }

    async rollback() {
      this.calls.push('rollback');
    }
  }

  test('a fake adapter can stand in for a real transaction in a use case test', async () => {
    const unitOfWork = new NoOpUnitOfWork();
    await unitOfWork.begin();
    await unitOfWork.commit();
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
  });
});
