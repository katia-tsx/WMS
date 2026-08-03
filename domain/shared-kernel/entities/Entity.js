'use strict';

const { Guard } = require('../guard/Guard');

/**
 * Entity is the base class for every domain object whose sameness is
 * defined by a persistent identity rather than by its attributes — two
 * Entities with the same id are the same conceptual thing even if every
 * other field on them differs (e.g. a Product renamed twice is still the
 * same Product). Contrast with `ValueObject`, whose equality is purely
 * structural.
 */
class Entity {
  /**
   * @param {string|number} id
   */
  constructor(id) {
    Guard.againstNullOrUndefined(id, 'id');
    this._id = id;
  }

  get id() {
    return this._id;
  }

  /**
   * @param {Entity|null|undefined} other
   * @returns {boolean}
   */
  equals(other) {
    if (other === null || other === undefined) return false;
    if (this === other) return true;
    if (!(other instanceof Entity)) return false;
    return this._id === other._id;
  }
}

module.exports = { Entity };
