'use strict';

/**
 * Result<T, E> represents the outcome of an operation that can fail in an
 * *expected* way (validation, a business rule, a not-found lookup) without
 * resorting to `throw`/`catch` for control flow. Build one with the static
 * `Result.ok(value)` / `Result.err(error)` factories; consume it with
 * `map`, `flatMap`, or `match` rather than branching on `instanceof`.
 * `throw` is reserved for programmer errors — bugs, not business outcomes.
 */
class Result {
  /**
   * @template T
   * @param {T} value
   * @returns {Ok<T>}
   */
  static ok(value) {
    return new Ok(value);
  }

  /**
   * @template E
   * @param {E} error
   * @returns {Err<E>}
   */
  static err(error) {
    return new Err(error);
  }
}

/**
 * @template T
 * @extends {Result}
 */
class Ok extends Result {
  /** @param {T} value */
  constructor(value) {
    super();
    this.value = value;
    this.isOk = true;
    this.isErr = false;
  }

  /**
   * @template U
   * @param {function(T): U} fn
   * @returns {Ok<U>}
   */
  map(fn) {
    return Result.ok(fn(this.value));
  }

  /** @param {function(unknown): unknown} _fn */
  mapErr(_fn) {
    return this;
  }

  /**
   * @template U
   * @param {function(T): Result} fn
   * @returns {Result}
   */
  flatMap(fn) {
    return fn(this.value);
  }

  /**
   * @template U
   * @param {{ ok: function(T): U, err: function(unknown): U }} handlers
   * @returns {U}
   */
  match({ ok }) {
    return ok(this.value);
  }

  /** @returns {T} */
  unwrap() {
    return this.value;
  }

  /**
   * @param {T} _defaultValue
   * @returns {T}
   */
  unwrapOr(_defaultValue) {
    return this.value;
  }
}

/**
 * @template E
 * @extends {Result}
 */
class Err extends Result {
  /** @param {E} error */
  constructor(error) {
    super();
    this.error = error;
    this.isOk = false;
    this.isErr = true;
  }

  /** @param {function(unknown): unknown} _fn */
  map(_fn) {
    return this;
  }

  /**
   * @template F
   * @param {function(E): F} fn
   * @returns {Err<F>}
   */
  mapErr(fn) {
    return Result.err(fn(this.error));
  }

  /** @param {function(unknown): Result} _fn */
  flatMap(_fn) {
    return this;
  }

  /**
   * @template U
   * @param {{ ok: function(unknown): U, err: function(E): U }} handlers
   * @returns {U}
   */
  match({ err }) {
    return err(this.error);
  }

  /** @returns {never} */
  unwrap() {
    throw this.error instanceof Error ? this.error : new Error(String(this.error));
  }

  /**
   * @template T
   * @param {T} defaultValue
   * @returns {T}
   */
  unwrapOr(defaultValue) {
    return defaultValue;
  }
}

module.exports = { Result, Ok, Err };
