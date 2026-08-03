'use strict';

const { UseCaseDecorator } = require('./UseCaseDecorator');
const { Guard } = require('../../../domain/shared-kernel/guard/Guard');

/**
 * TransactionalUseCaseDecorator wraps a single use case's `execute` in
 * its own IUnitOfWork transaction: begins before, commits on a
 * `Result.ok`, and rolls back on either a `Result.err` or a thrown
 * (programmer) error. Contrast with `ApplicationService`
 * (application/services/ApplicationService.js), which wraps a *sequence*
 * of several use cases in one shared transaction — use this decorator
 * when a single use case's own writes need atomicity, that base class
 * when multiple use cases' writes need to succeed or fail together.
 */
class TransactionalUseCaseDecorator extends UseCaseDecorator {
  /**
   * @param {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }} innerUseCase
   * @param {Object} options
   * @param {import('../../ports/IUnitOfWork').IUnitOfWork} options.unitOfWork
   */
  constructor(innerUseCase, { unitOfWork } = {}) {
    super(innerUseCase);
    Guard.againstNullOrUndefined(unitOfWork, 'unitOfWork');
    this.unitOfWork = unitOfWork;
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
      }
      return result;
    } catch (error) {
      await this.unitOfWork.rollback();
      throw error;
    }
  }
}

module.exports = { TransactionalUseCaseDecorator };
