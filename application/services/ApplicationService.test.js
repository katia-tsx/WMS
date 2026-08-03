'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { ApplicationService } = require('./ApplicationService');

class RecordingUnitOfWork {
  constructor() {
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

describe('ApplicationService', () => {
  test('requires a unitOfWork', () => {
    assert.throws(() => new ApplicationService({}));
  });
});

describe('ApplicationService#runInTransaction', () => {
  test('begins, runs work, commits, and returns work\'s value on success', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const service = new ApplicationService({ unitOfWork });

    const value = await service.runInTransaction(async () => 'workflow result');

    assert.equal(value, 'workflow result');
    assert.deepEqual(unitOfWork.calls, ['begin', 'commit']);
  });

  test('rolls back and rethrows when work throws', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const service = new ApplicationService({ unitOfWork });

    await assert.rejects(
      () => service.runInTransaction(async () => { throw new Error('step 2 failed'); }),
      /step 2 failed/,
    );
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
  });

  test('a sequence of steps rolls back together if a later step fails', async () => {
    const unitOfWork = new RecordingUnitOfWork();
    const service = new ApplicationService({ unitOfWork });
    const completedSteps = [];

    await assert.rejects(() =>
      service.runInTransaction(async () => {
        completedSteps.push('step-1');
        completedSteps.push('step-2');
        throw new Error('step-3 failed');
      }),
    );

    // Both prior steps ran (this fake has no real storage to check), but
    // the unit of work was rolled back exactly once, after both ran.
    assert.deepEqual(completedSteps, ['step-1', 'step-2']);
    assert.deepEqual(unitOfWork.calls, ['begin', 'rollback']);
  });
});
