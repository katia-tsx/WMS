'use strict';

/**
 * OrderLine Entity
 */
class OrderLine {
  constructor({ id, productSku, quantity, unitPrice, allocatedQuantity = 0, backorderedQuantity = 0, status = 'PENDING' }) {
    if (!id) throw new Error('OrderLine requires id');
    if (!productSku) throw new Error('OrderLine requires productSku');
    if (typeof quantity !== 'number' || quantity <= 0) throw new Error('OrderLine quantity must be positive');

    this.id = id;
    this.productSku = productSku;
    this.quantity = quantity;
    this.unitPrice = unitPrice || 0;
    this.allocatedQuantity = allocatedQuantity;
    this.backorderedQuantity = backorderedQuantity;
    this.status = status;
  }

  allocate(amount) {
    const alloc = Math.min(amount, this.quantity - this.allocatedQuantity);
    this.allocatedQuantity += alloc;
    this.backorderedQuantity = Math.max(0, this.quantity - this.allocatedQuantity);

    if (this.allocatedQuantity === this.quantity) {
      this.status = 'ALLOCATED';
    } else if (this.allocatedQuantity > 0) {
      this.status = 'PARTIALLY_ALLOCATED';
    } else {
      this.status = 'BACKORDERED';
    }
    return alloc;
  }
}

module.exports = { OrderLine };
