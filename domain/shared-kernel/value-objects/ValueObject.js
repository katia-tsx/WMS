'use strict';

const { Guard } = require('../guard/Guard');

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 * @returns {boolean}
 */
function shallowEqual(a, b) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.is(a[key], b[key]));
}

/**
 * ValueObject is the base class for every domain object defined only by
 * its attributes, with no identity — two ValueObjects with the same
 * `props` are interchangeable (contrast with `Entity`, whose sameness is
 * identity-based). Subclasses pass their validated fields to `super(props)`
 * as the last constructor step; the base class freezes both the props bag
 * and the instance itself, so a ValueObject can never be mutated after
 * construction — any attempted reassignment throws a TypeError in strict
 * mode. Subclasses expose their fields via getters over `this.props`.
 */
class ValueObject {
  /**
   * @param {Record<string, unknown>} props
   */
  constructor(props) {
    Guard.againstNullOrUndefined(props, 'props');
    this.props = Object.freeze({ ...props });
    Object.freeze(this);
  }

  /**
   * @param {ValueObject|null|undefined} other
   * @returns {boolean}
   */
  equals(other) {
    if (other === null || other === undefined) return false;
    if (!(other instanceof ValueObject)) return false;
    if (other.constructor !== this.constructor) return false;
    return shallowEqual(this.props, other.props);
  }
}

module.exports = { ValueObject };
