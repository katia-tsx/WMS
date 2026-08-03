'use strict';

const { Guard } = require('../../../domain/shared-kernel/guard/Guard');
const { LoggingUseCaseDecorator } = require('./LoggingUseCaseDecorator');
const { AuthorizationUseCaseDecorator } = require('./AuthorizationUseCaseDecorator');
const { TransactionalUseCaseDecorator } = require('./TransactionalUseCaseDecorator');
const { MetricsUseCaseDecorator } = require('./MetricsUseCaseDecorator');

/**
 * UseCasePipelineBuilder composes cross-cutting decorators around a use
 * case with a fluent API, so a composition root reads as a declaration of
 * *which* concerns apply to a use case, instead of a pile of
 * `new XDecorator(new YDecorator(...))` nesting.
 *
 * Each `.withX()` call wraps whatever the builder currently holds, so the
 * *last* call becomes the *outermost* layer — the first thing that runs
 * on the way in, and the last thing that sees the result on the way out.
 * The recommended order is transaction innermost, then authorization,
 * then metrics, then logging outermost:
 *
 *   new UseCasePipelineBuilder(adjustStockUseCase)
 *     .withTransaction(unitOfWork)   // innermost: only opens once authorized
 *     .withAuthorization(policy)     // denies before a transaction ever opens
 *     .withMetrics(metricsRecorder)  // counts/times denials too, not just real attempts
 *     .withLogging(logger)           // outermost: logs both denials and successes
 *     .build();
 *
 * Controllers and other driving adapters call *only* the object
 * `build()` returns — never the bare use case, and never a domain entity
 * directly (see ARCHITECTURE.md §7) — so every request gets the same
 * auditing, permission checks, and transactional behavior regardless of
 * which controller invoked it.
 */
class UseCasePipelineBuilder {
  /**
   * @param {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }} useCase
   */
  constructor(useCase) {
    Guard.againstNullOrUndefined(useCase, 'useCase');
    this.useCase = useCase;
  }

  /**
   * @param {import('../../ports/ILogger').ILogger} logger
   * @param {string} [useCaseName]
   * @returns {UseCasePipelineBuilder}
   */
  withLogging(logger, useCaseName) {
    this.useCase = new LoggingUseCaseDecorator(this.useCase, { logger, useCaseName });
    return this;
  }

  /**
   * @param {function(*): (boolean|Promise<boolean>)} policy
   * @param {string} [useCaseName]
   * @returns {UseCasePipelineBuilder}
   */
  withAuthorization(policy, useCaseName) {
    this.useCase = new AuthorizationUseCaseDecorator(this.useCase, { policy, useCaseName });
    return this;
  }

  /**
   * @param {import('../../ports/IUnitOfWork').IUnitOfWork} unitOfWork
   * @param {import('../../ports/IEventPublisher').IEventPublisher} [eventPublisher] if given, buffered domain events on the use case's returned aggregate are published once (and only once) the transaction commits
   * @returns {UseCasePipelineBuilder}
   */
  withTransaction(unitOfWork, eventPublisher) {
    this.useCase = new TransactionalUseCaseDecorator(this.useCase, { unitOfWork, eventPublisher });
    return this;
  }

  /**
   * @param {import('../../ports/IMetricsRecorder').IMetricsRecorder} metricsRecorder
   * @param {string} [useCaseName]
   * @returns {UseCasePipelineBuilder}
   */
  withMetrics(metricsRecorder, useCaseName) {
    this.useCase = new MetricsUseCaseDecorator(this.useCase, { metricsRecorder, useCaseName });
    return this;
  }

  /**
   * @returns {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }}
   */
  build() {
    return this.useCase;
  }
}

module.exports = { UseCasePipelineBuilder };
