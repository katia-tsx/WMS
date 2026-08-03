'use strict';

const { UnregisteredDependencyError, CircularDependencyError } = require('./errors');

const LIFETIMES = new Set(['singleton', 'transient']);

/**
 * Container is a small, framework-free dependency injection container.
 * It has no knowledge of application/ or infrastructure/ — CompositionRoot
 * is the only file that teaches it what to build; Container itself just
 * remembers named factories and how to resolve them.
 *
 * Bindings are registered by name against a factory function:
 *
 *   container.register('inventoryRepository', () => new InMemoryInventoryRepository());
 *   container.register('adjustStockUseCase', (c) => new AdjustStockUseCase({
 *     inventoryRepository: c.resolve('inventoryRepository'),
 *     eventPublisher: c.resolve('eventPublisher'),
 *   }));
 *
 * A factory receives the container itself, so constructor injection is
 * just "resolve what you depend on, then construct" — there is no
 * decorator/reflection magic reading constructor parameter names.
 */
class Container {
  constructor() {
    /** @type {Map<string, { factory: function(Container): unknown, lifetime: 'singleton'|'transient' }>} */
    this._registrations = new Map();
    /** @type {Map<string, unknown>} */
    this._singletons = new Map();
    /** @type {string[]} */
    this._resolutionStack = [];
  }

  /**
   * Register a binding under `name`.
   *
   * Pre:  `factory` is a function `(container) => value`; `lifetime` (if
   *       given) is "singleton" or "transient".
   * Post: subsequent `resolve(name)` calls invoke `factory` according to
   *       `lifetime`. Registering the same `name` again replaces the
   *       previous binding (and, for a singleton, discards any cached
   *       instance) — useful for tests overriding one binding in an
   *       otherwise-real graph.
   *
   * @param {string} name
   * @param {function(Container): unknown} factory
   * @param {{ lifetime?: 'singleton'|'transient' }} [options]
   * @returns {Container} `this`, so registrations can be chained
   */
  register(name, factory, { lifetime = 'transient' } = {}) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new TypeError('Container#register requires a non-empty string name.');
    }
    if (typeof factory !== 'function') {
      throw new TypeError(`Cannot register "${name}": factory must be a function, got ${typeof factory}.`);
    }
    if (!LIFETIMES.has(lifetime)) {
      throw new TypeError(`Cannot register "${name}": lifetime must be "singleton" or "transient", got "${lifetime}".`);
    }

    this._registrations.set(name, { factory, lifetime });
    this._singletons.delete(name);
    return this;
  }

  /**
   * @param {string} name
   * @returns {boolean} whether a binding has been registered under `name`
   */
  has(name) {
    return this._registrations.has(name);
  }

  /**
   * Resolve the value bound to `name`, building it (and, transitively,
   * everything its factory resolves) on demand.
   *
   * Pre:  `name` has been `register`ed, directly or indirectly (a
   *       dependency of a dependency), and resolving it does not require
   *       resolving `name` again before it finishes (no circular
   *       dependency).
   * Post: for a "singleton" binding, the same instance is returned on
   *       every call after the first. For a "transient" binding, `factory`
   *       runs again and a new instance is returned every time.
   *
   * @param {string} name
   * @returns {*}
   */
  resolve(name) {
    const registration = this._registrations.get(name);
    if (!registration) {
      throw new UnregisteredDependencyError(name);
    }

    if (registration.lifetime === 'singleton' && this._singletons.has(name)) {
      return this._singletons.get(name);
    }

    if (this._resolutionStack.includes(name)) {
      throw new CircularDependencyError([...this._resolutionStack, name]);
    }

    this._resolutionStack.push(name);
    try {
      const instance = registration.factory(this);
      if (registration.lifetime === 'singleton') {
        this._singletons.set(name, instance);
      }
      return instance;
    } finally {
      this._resolutionStack.pop();
    }
  }
}

module.exports = { Container };
