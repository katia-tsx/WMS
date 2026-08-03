'use strict';

/**
 * NotImplementedError signals a programmer error, not an expected business
 * failure: a concrete adapter extended a port but forgot to override one
 * of its methods, so the abstract stub ran instead. It should never be
 * caught and handled by application code — the fix is always to implement
 * the method on the adapter, the same way an unhandled TypeError would be
 * fixed, which is why this is thrown rather than returned as a
 * `Result.err(...)` (see `domain/shared-kernel/result/Result`).
 */
class NotImplementedError extends Error {
  /**
   * @param {string} portName the port class the caller expected an adapter for (e.g. "IRepository")
   * @param {string} methodName the method the adapter failed to override (e.g. "findById")
   */
  constructor(portName, methodName) {
    super(`${portName}.${methodName}() is a port contract method and must be implemented by a concrete adapter.`);
    this.name = 'NotImplementedError';
    this.portName = portName;
    this.methodName = methodName;
  }
}

module.exports = { NotImplementedError };
