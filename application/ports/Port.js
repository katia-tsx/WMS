'use strict';

const { NotImplementedError } = require('./errors/NotImplementedError');

/**
 * Port is the common base for every abstract port contract under
 * application/ports/. It carries no behavior of its own beyond
 * `_abstract`, a small helper so each port method's stub body is a single
 * line (`this._abstract('methodName')`) instead of repeating
 * `throw new NotImplementedError(...)` everywhere.
 *
 * Convention: a concrete adapter `extends` the port it implements and
 * overrides every method the port declares. Because the base method
 * throws, forgetting to override one fails loudly and immediately the
 * first time it is called — not silently at some later point because a
 * duck-typed shape happened to be missing a key. Use cases in
 * application/ only ever depend on the port (constructor-injected), never
 * on the concrete adapter class, so a unit test can inject an in-memory
 * fake that extends the same port.
 */
class Port {
  /**
   * @param {string} methodName
   * @returns {never}
   */
  _abstract(methodName) {
    throw new NotImplementedError(this.constructor.name, methodName);
  }
}

module.exports = { Port };
