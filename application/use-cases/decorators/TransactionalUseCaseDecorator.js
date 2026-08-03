'use strict';

const { UseCaseDecorator } = require('./UseCaseDecorator');
const { Guard } = require('../../../domain/shared-kernel/guard/Guard');
const { flushDomainEvents } = require('../../events/flushDomainEvents');

/**
 * TransactionalUseCaseDecorator wraps a single use case's `execute` in
 * its own IUnitOfWork transaction: begins before, commits on a
 * `Result.ok`, and rolls back on either a `Result.err` or a thrown
 * (programmer) error. Contrast with `ApplicationService`
 * (application/services/ApplicationService.js), which wraps a *sequence*
 * of several use cases in one shared transaction — use this decorator
 * when a single use case's own writes need atomicity, that base class
 * when multiple use cases' writes need to succeed or fail together.
 *
 * If an `eventPublisher` is supplied, this is also where the rule "an
 * aggregate only records events internally; publishing happens only
 * after a successful commit" (see domain/shared-kernel's
 * AggregateRoot#addDomainEvent and application/events/flushDomainEvents)
 * is enforced for a single use case: events are flushed from
 * `result.value` *only* in the commit branch, never in the rollback
 * branch — so a use case whose transaction rolled back can never leak
 * events for writes that never actually persisted.
 */
class TransactionalUseCaseDecorator extends UseCaseDecorator {
  /**
   * @param {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }} innerUseCase
   * @param {Object} options
   * @param {import('../../ports/IUnitOfWork').IUnitOfWork} options.unitOfWork
   * @param {import('../../ports/IEventPublisher').IEventPublisher} [options.eventPublisher] if given, `result.value` (or each element, if it's an array) is asked for buffered domain events and they are published — but only once the transaction has committed
   */
  constructor(innerUseCase, { unitOfWork, eventPublisher } = {}) {
    super(innerUseCase);
    Guard.againstNullOrUndefined(unitOfWork, 'unitOfWork');
    this.unitOfWork = unitOfWork;
    this.eventPublisher = eventPublisher ?? null;
  }

  /**
   * @param {*} input
   * @returns {Promise<import('../../../domain/shared-kernel/result/Result').Result>}
   */
  async execute(input) {
    await this.unitOfWork.begin();
    try {
      const result = await super.execute(input);
      if (result.isErr) {
        await this.unitOfWork.rollback();
      } else {
        await this.unitOfWork.commit();
        if (this.eventPublisher) {
          await flushDomainEvents(result.value, this.eventPublisher);
        }
      }
      return result;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}

module.exports = { TransactionalUseCaseDecorator };
