'use strict';

const { UseCaseDecorator } = require('./UseCaseDecorator');
const { Guard } = require('../../../domain/shared-kernel/guard/Guard');

/**
 * LoggingUseCaseDecorator logs a use case's start, success, and failure
 * through an injected ILogger, so every use case gets consistent,
 * structured auditing without writing `logger.info(...)` calls inline in
 * its own `handle`.
 */
class LoggingUseCaseDecorator extends UseCaseDecorator {
  /**
   * @param {{ execute: function(*): Promise<import('../../../domain/shared-kernel/result/Result').Result> }} innerUseCase
   * @param {Object} options
   * @param {import('../../ports/ILogger').ILogger} options.logger
   * @param {string} [options.useCaseName] defaults to `innerUseCase.constructor.name`
   */
  constructor(innerUseCase, { logger, useCaseName } = {}) {
    super(innerUseCase);
    Guard.againstNullOrUndefined(logger, 'logger');
    this.logger = logger;
    this.useCaseName = useCaseName ?? innerUseCase.constructor.name;
  }

  /**
   * @param {*} input
   * @returns {Promise<import('../../../domain/shared-kernel/result/Result').Result>}
   */
  async execute(input) {
    this.logger.info(`${this.useCaseName} started`, { input });

    const result = await super.execute(input);

    if (result.isErr) {
      const { name, message, code } = result.error;
      this.logger.warn(`${this.useCaseName} failed`, { error: { name, message, code } });
    } else {
      this.logger.info(`${this.useCaseName} succeeded`);
    }

    return result;
  }
}

module.exports = { LoggingUseCaseDecorator };
