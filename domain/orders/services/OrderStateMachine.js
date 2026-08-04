'use strict';

class InvalidOrderStateTransitionError extends Error {
  constructor(currentState, targetState) {
    super(`Invalid order state transition from ${currentState} to ${targetState}`);
    this.name = 'InvalidOrderStateTransitionError';
    this.currentState = currentState;
    this.targetState = targetState;
  }
}

const ORDER_STATES = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  ALLOCATED: 'ALLOCATED',
  PICKING: 'PICKING',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD',
};

const ALLOWED_TRANSITIONS = {
  [ORDER_STATES.DRAFT]: [ORDER_STATES.CONFIRMED, ORDER_STATES.CANCELLED, ORDER_STATES.ON_HOLD],
  [ORDER_STATES.CONFIRMED]: [ORDER_STATES.ALLOCATED, ORDER_STATES.CANCELLED, ORDER_STATES.ON_HOLD],
  [ORDER_STATES.ALLOCATED]: [ORDER_STATES.PICKING, ORDER_STATES.CANCELLED, ORDER_STATES.ON_HOLD],
  [ORDER_STATES.PICKING]: [ORDER_STATES.PACKED, ORDER_STATES.CANCELLED, ORDER_STATES.ON_HOLD],
  [ORDER_STATES.PACKED]: [ORDER_STATES.SHIPPED, ORDER_STATES.CANCELLED, ORDER_STATES.ON_HOLD],
  [ORDER_STATES.SHIPPED]: [ORDER_STATES.DELIVERED],
  [ORDER_STATES.DELIVERED]: [],
  [ORDER_STATES.CANCELLED]: [],
  [ORDER_STATES.ON_HOLD]: [ORDER_STATES.CONFIRMED, ORDER_STATES.ALLOCATED, ORDER_STATES.PICKING, ORDER_STATES.PACKED, ORDER_STATES.CANCELLED],
};

class OrderStateMachine {
  static transition(currentState, targetState) {
    if (!ORDER_STATES[currentState] || !ORDER_STATES[targetState]) {
      throw new InvalidOrderStateTransitionError(currentState, targetState);
    }

    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowed.includes(targetState)) {
      throw new InvalidOrderStateTransitionError(currentState, targetState);
    }

    return targetState;
  }
}

module.exports = { ORDER_STATES, OrderStateMachine, InvalidOrderStateTransitionError };
