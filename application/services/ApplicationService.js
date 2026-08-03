'use strict';

const { Guard } = require('../../domain/shared-kernel/guard/Guard');
const { flushDomainEvents } = require('../events/flushDomainEvents');

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
   * @param {import('../ports/IEventPublisher').IEventPublisher} [deps.eventPublisher] used by `publishDomainEvents` below; omit for a workflow with nothing worth publishing
   */
  constructor({ unitOfWork, eventPublisher }) {
    Guard.againstNullOrUndefined(unitOfWork, 'unitOfWork');
    this.unitOfWork = unitOfWork;
    this.eventPublisher = eventPublisher ?? null;
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

  /**
   * Flushes and publishes buffered domain events from one or more
   * aggregates the workflow touched. Call this only once the workflow's
   * `runInTransaction` call has already resolved successfully — never
   * from inside `work` itself, and never after a rollback (a thrown
   * error from `runInTransaction` should propagate past this call, not
   * be followed by it) — so events can never leak for a workflow that
   * didn't actually persist. Mirrors what `TransactionalUseCaseDecorator`
   * does automatically for a single use case; a multi-step workflow does
   * it explicitly because only the subclass knows which aggregates its
   * own steps touched.
   *
   * A no-op if no `eventPublisher` was supplied.
   *
   * @param {*} aggregateOrAggregates
   * @returns {Promise<void>}
   */
  async publishDomainEvents(aggregateOrAggregates) {
    if (!this.eventPublisher) return;
    await flushDomainEvents(aggregateOrAggregates, this.eventPublisher);
  }
}

module.exports = { ApplicationService };
