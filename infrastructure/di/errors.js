'use strict';

/**
 * Raised by `Container#resolve` when no binding exists for the requested
 * name. Always a programmer error — a missing `container.register(...)`
 * call — never an expected runtime outcome.
 */
class UnregisteredDependencyError extends Error {
  /** @param {string} name */
  constructor(name) {
    super(`No binding registered for "${name}". Did you forget to call container.register("${name}", factory)?`);
    this.name = 'UnregisteredDependencyError';
    this.dependencyName = name;
  }
}

/**
 * Raised by `Container#resolve` when resolving a name would require
 * resolving that same name again further down the call stack — e.g. `a`'s
 * factory resolves `b`, whose factory resolves `a`. The message lists the
 * full path so the offending registrations are obvious without a debugger.
 */
class CircularDependencyError extends Error {
  /** @param {string[]} cyclePath the resolution stack plus the name that closed the cycle, in order */
  constructor(cyclePath) {
    super(`Circular dependency detected: ${cyclePath.join(' -> ')}`);
    this.name = 'CircularDependencyError';
    this.cyclePath = cyclePath;
  }
}

module.exports = { UnregisteredDependencyError, CircularDependencyError };
