'use strict';

/**
 * AuditSessionStateMachine
 * Enforces valid state transitions for Annual Audit Sessions:
 * PLANNED -> IN_PROGRESS -> RECONCILIATION -> CLOSED
 */

const AUDIT_STATES = {
  PLANNED: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RECONCILIATION: 'RECONCILIATION',
  CLOSED: 'CLOSED',
};

const ALLOWED_TRANSITIONS = {
  [AUDIT_STATES.PLANNED]: [AUDIT_STATES.IN_PROGRESS],
  [AUDIT_STATES.IN_PROGRESS]: [AUDIT_STATES.RECONCILIATION],
  [AUDIT_STATES.RECONCILIATION]: [AUDIT_STATES.CLOSED],
  [AUDIT_STATES.CLOSED]: [],
};

class AuditSessionStateMachine {
  /**
   * Validates and executes a transition from currentState to targetState
   * @param {string} currentState
   * @param {string} targetState
   * @returns {string} nextState
   */
  static transition(currentState, targetState) {
    if (!AUDIT_STATES[currentState]) {
      throw new Error(`Unknown audit session state: ${currentState}`);
    }
    if (!AUDIT_STATES[targetState]) {
      throw new Error(`Unknown target audit session state: ${targetState}`);
    }

    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowed.includes(targetState)) {
      throw new Error(
        `Invalid audit session state transition from ${currentState} to ${targetState}. Allowed: [${allowed.join(', ')}]`
      );
    }

    return targetState;
  }
}

module.exports = { AUDIT_STATES, AuditSessionStateMachine };
