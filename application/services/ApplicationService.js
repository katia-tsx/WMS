'use strict';

const { Guard } = require('../../domain/shared-kernel/guard/Guard');

/**
 * ApplicationService is the base class for a workflow that composes
 * several use cases (possibly across bounded contexts) and needs them to
 * succeed or fail together — see application/orchestrators/. Unlike
 * `TransactionalUseCaseDecorator` (application/use-cases/decorators/),
 * which wraps a *single* use case's own transaction,
 * `ApplicationService#runInTransaction` wraps a *sequence* of use case
 * calls in one shared `IUnitOfWork`, so a failure partway through rolls
 * back every aggregate the workflow already touched — not just the one
 * that failed.
 */
class ApplicationService {
  /**
   * @param {Object} deps
   * @param {import('../ports/IUnitOfWork').IUnitOfWork} deps.unitOfWork
   */
  constructor({ unitOfWork }) {
    Guard.againstNullOrUndefined(unitOfWork, 'unitOfWork');
    this.unitOfWork = unitOfWork;
  }

  /**
   * Runs `work` inside a transactional boundary.
   *
   * Pre:  `work` is an async function. Anything it throws is treated as a
   *       reason to roll back. A use case's own *expected* failures come
   *       back as `Result.err`, not a throw — if one of those should
   *       abort the whole workflow, `work` must throw it explicitly
   *       (e.g. `if (result.isErr) throw result.error;`); a `Result.err`
   *       returned quietly from `work` would otherwise still commit.
   * Post: on success, the unit of work is committed and `work`'s return
   *       value is returned. On a thrown error, the unit of work is
   *       rolled back and the same error is rethrown — storage is left
   *       exactly as it was before `work` ran.
   *
   * @template T
   * @param {function(): Promise<T>} work
   * @returns {Promise<T>}
   */
  async runInTransaction(work) {
    await this.unitOfWork.begin();
    try {
      const result = await work();
      await this.unitOfWork.commit();
      return result;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}

module.exports = { ApplicationService };
