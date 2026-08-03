'use strict';

const { Port } = require('./Port');

/**
 * IClock — abstracts "the current time" so use cases and domain services
 * that need `now` (timestamps, deadlines, TTLs) stay deterministic and
 * testable: a test injects a fake clock frozen at a known instant instead
 * of asserting against whatever `Date.now()` happens to be when the test
 * runs.
 *
 * @interface
 */
class IClock extends Port {
  /**
   * Pre:  none.
   * Post: returns the current instant. Two calls in immediate succession
   *       are not guaranteed to return equal values — only a
   *       non-decreasing sequence — unless the concrete adapter is a
   *       frozen fake.
   *
   * @returns {Date}
   */
  now() {
    this._abstract('now');
  }
}

module.exports = { IClock };
