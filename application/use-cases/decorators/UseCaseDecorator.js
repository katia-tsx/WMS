'use strict';

const { Guard } = require('../../../domain/shared-kernel/guard/Guard');

/**
 * UseCaseDecorator is the base for every cross-cutting wrapper around a
 * use-case-shaped object (anything with an `execute(input)` that returns
 * a `Result`) — logging, authorization, transactions. A concrete
 * decorator overrides `execute` to add its own behavior before/after
 * delegating to `super.execute(input)` (which calls
 * `this.innerUseCase.execute(input)`), so a use case's own `handle` never
 * has to know these concerns exist. See UseCasePipelineBuilder for how
 * decorators compose.
 */
class UseCaseDecorator {
  /**
   * @param {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }} innerUseCase
   */
  constructor(innerUseCase) {
    Guard.againstNullOrUndefined(innerUseCase, 'innerUseCase');
    this.innerUseCase = innerUseCase;
  }

  /**
   * @param {*} input
   * @returns {Promise<import('../../../domain/shared-kernel/result/Result').Result>}
   */
  async execute(input) {
    return this.innerUseCase.execute(input);
  }
}

module.exports = { UseCaseDecorator };
