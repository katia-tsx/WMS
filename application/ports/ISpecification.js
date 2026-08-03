'use strict';

const { Port } = require('./Port');

/**
 * ISpecification<T> — a composable predicate over aggregates of type T,
 * consumed by `IRepository#findBySpecification` so query rules ("orders
 * older than 30 days and unpaid") live as explicit, independently testable
 * domain objects instead of as ad hoc SQL scattered across adapters.
 *
 * Concrete specifications extend this class and override `isSatisfiedBy`
 * only; `and`/`or`/`not` are inherited and return new composite
 * specifications (`AndSpecification`/`OrSpecification`/`NotSpecification`,
 * also exported below), so specifications combine without any subclass
 * needing to know composition exists.
 *
 * @template T
 * @interface
 */
class ISpecification extends Port {
  /**
   * Pre:  `candidate` is an instance of T.
   * Post: returns true iff `candidate` satisfies this specification's
   *       rule. Must be a pure function of `candidate` — no I/O, no side
   *       effects — so specifications stay safe to combine and reorder.
   *
   * @param {T} candidate
   * @returns {boolean}
   */
  isSatisfiedBy(candidate) {
    this._abstract('isSatisfiedBy');
  }

  /**
   * @param {ISpecification<T>} other
   * @returns {ISpecification<T>}
   */
  and(other) {
    return new AndSpecification(this, other);
  }

  /**
   * @param {ISpecification<T>} other
   * @returns {ISpecification<T>}
   */
  or(other) {
    return new OrSpecification(this, other);
  }

  /**
   * @returns {ISpecification<T>}
   */
  not() {
    return new NotSpecification(this);
  }
}

/**
 * @template T
 * @extends {ISpecification<T>}
 */
class AndSpecification extends ISpecification {
  /**
   * @param {ISpecification<T>} left
   * @param {ISpecification<T>} right
   */
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  /** @param {T} candidate */
  isSatisfiedBy(candidate) {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

/**
 * @template T
 * @extends {ISpecification<T>}
 */
class OrSpecification extends ISpecification {
  /**
   * @param {ISpecification<T>} left
   * @param {ISpecification<T>} right
   */
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  /** @param {T} candidate */
  isSatisfiedBy(candidate) {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

/**
 * @template T
 * @extends {ISpecification<T>}
 */
class NotSpecification extends ISpecification {
  /** @param {ISpecification<T>} specification */
  constructor(specification) {
    super();
    this.specification = specification;
  }

  /** @param {T} candidate */
  isSatisfiedBy(candidate) {
    return !this.specification.isSatisfiedBy(candidate);
  }
}

module.exports = { ISpecification, AndSpecification, OrSpecification, NotSpecification };
