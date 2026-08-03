'use strict';

const { UseCaseDecorator } = require('./UseCaseDecorator');
const { Guard } = require('../../../domain/shared-kernel/guard/Guard');
const { Result } = require('../../../domain/shared-kernel/result/Result');
const { AuthorizationError } = require('../../errors/AuthorizationError');

/**
 * AuthorizationUseCaseDecorator enforces a permission check before a use
 * case is allowed to run, so "can this actor do this?" lives in one place
 * per use case instead of as an `if` at the top of every `handle`. On
 * denial it short-circuits with `Result.err(AuthorizationError)` — the
 * inner use case's `handle` never runs, and (composed beneath a
 * TransactionalUseCaseDecorator, per UseCasePipelineBuilder's recommended
 * order) no transaction is even opened for a request that was never
 * going to be allowed.
 */
class AuthorizationUseCaseDecorator extends UseCaseDecorator {
  /**
   * @param {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }} innerUseCase
   * @param {Object} options
   * @param {function(*): (boolean|Promise<boolean>)} options.policy receives the same `input` `execute` was called with; returns whether the actor is allowed to proceed
   * @param {string} [options.useCaseName] used only in the denial message; defaults to `innerUseCase.constructor.name`
   */
  constructor(innerUseCase, { policy, useCaseName } = {}) {
    super(innerUseCase);
    Guard.againstNullOrUndefined(policy, 'policy');
    this.policy = policy;
    this.useCaseName = useCaseName ?? innerUseCase.constructor.name;
  }

  /**
   * @param {*} input
   * @returns {Promise<import('../../../domain/shared-kernel/result/Result').Result>}
   */
  async execute(input) {
    const isAuthorized = await this.policy(input);
    if (!isAuthorized) {
      return Result.err(new AuthorizationError(`Not authorized to execute ${this.useCaseName}.`));
    }
    return super.execute(input);
  }
}

module.exports = { AuthorizationUseCaseDecorator };
