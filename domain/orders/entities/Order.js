'use strict';

const { AggregateRoot } = require('../../shared-kernel/entities/AggregateRoot');
const { ORDER_STATES, OrderStateMachine } = require('../services/OrderStateMachine');
const { OrderLine } = require('./OrderLine');
const { ShippingAddress } = require('../value-objects/ShippingAddress');

class Order extends AggregateRoot {
  constructor({
    id,
    customerId,
    slaTier = 'STANDARD',
    lines = [],
    shippingAddress,
    priorityScore = 50,
    state = ORDER_STATES.DRAFT,
    createdAt = new Date(),
  }) {
    super(id);
    if (!customerId) throw new Error('Order requires customerId');

    this.customerId = customerId;
    this.slaTier = slaTier;
    this.lines = lines.map((l) => (l instanceof OrderLine ? l : new OrderLine(l)));
    this.shippingAddress = shippingAddress instanceof ShippingAddress ? shippingAddress : new ShippingAddress(shippingAddress);
    this.priorityScore = priorityScore;
    this.state = state;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  transitionTo(targetState) {
    const nextState = OrderStateMachine.transition(this.state, targetState);
    this.state = nextState;
  }

  confirm() {
    this.transitionTo(ORDER_STATES.CONFIRMED);
  }

  allocate() {
    this.transitionTo(ORDER_STATES.ALLOCATED);
  }

  startPicking() {
    this.transitionTo(ORDER_STATES.PICKING);
  }

  pack() {
    this.transitionTo(ORDER_STATES.PACKED);
  }

  ship() {
    this.transitionTo(ORDER_STATES.SHIPPED);
  }

  deliver() {
    this.transitionTo(ORDER_STATES.DELIVERED);
  }

  cancel() {
    this.transitionTo(ORDER_STATES.CANCELLED);
  }

  isFullyAllocated() {
    return this.lines.every((line) => line.status === 'ALLOCATED');
  }
}

module.exports = { Order };
