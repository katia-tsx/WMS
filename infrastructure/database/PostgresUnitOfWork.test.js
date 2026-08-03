'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { PostgresUnitOfWork } = require('./PostgresUnitOfWork');

describe('PostgresUnitOfWork', () => {
  test('requires a connectionString to construct', () => {
    assert.throws(() => new PostgresUnitOfWork({}), /connectionString/);
  });

  test('construction succeeds with a connectionString, so DI resolution never fails', () => {
    const unitOfWork = new PostgresUnitOfWork({ connectionString: 'postgres://test' });
    assert.equal(unitOfWork.connectionString, 'postgres://test');
  });

  test('begin/commit/rollback are honestly stubbed rather than silently no-ops', async () => {
    const unitOfWork = new PostgresUnitOfWork({ connectionString: 'postgres://test' });
    await assert.rejects(() => unitOfWork.begin(), /not yet implemented/);
    await assert.rejects(() => unitOfWork.commit(), /not yet implemented/);
    await assert.rejects(() => unitOfWork.rollback(), /not yet implemented/);
  });
});
