'use strict';

/**
 * ShippingAddress Value Object
 */
class ShippingAddress {
  constructor({ street, city, state, zipCode, country = 'USA' }) {
    if (!street || typeof street !== 'string') throw new Error('ShippingAddress requires street');
    if (!city || typeof city !== 'string') throw new Error('ShippingAddress requires city');
    if (!state || typeof state !== 'string') throw new Error('ShippingAddress requires state');
    if (!zipCode || typeof zipCode !== 'string') throw new Error('ShippingAddress requires zipCode');

    this.street = street;
    this.city = city;
    this.state = state;
    this.zipCode = zipCode;
    this.country = country;
  }
}

module.exports = { ShippingAddress };
