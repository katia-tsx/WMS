'use strict';

const { AUDIT_STATES, AuditSessionStateMachine } = require('../services/AuditSessionStateMachine');
const { AuditCountEntry } = require('../value-objects/AuditCountEntry');

/**
 * AnnualAuditSession Aggregate Root
 * Manages full warehouse freeze-and-count audit sessions.
 */
class AnnualAuditSession {
  /**
   * @param {Object} params
   * @param {string} params.id
   * @param {string} params.warehouseId
   * @param {string} [params.state=AUDIT_STATES.PLANNED]
   * @param {boolean} [params.isWarehouseFrozen=false]
   * @param {AuditCountEntry[]} [params.countEntries=[]]
   * @param {Date} [params.createdAt]
   */
  constructor({
    id,
    warehouseId,
    state = AUDIT_STATES.PLANNED,
    isWarehouseFrozen = false,
    countEntries = [],
    createdAt = new Date(),
  }) {
    if (!id || typeof id !== 'string') throw new Error('AnnualAuditSession requires an id');
    if (!warehouseId || typeof warehouseId !== 'string') throw new Error('AnnualAuditSession requires a warehouseId');

    this.id = id;
    this.warehouseId = warehouseId;
    this.state = state;
    this.isWarehouseFrozen = Boolean(isWarehouseFrozen);
    this.countEntries = countEntries.map((e) => (e instanceof AuditCountEntry ? e : new AuditCountEntry(e)));
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
  }

  /**
   * Starts the audit session and freezes the warehouse
   */
  startAudit() {
    this.state = AuditSessionStateMachine.transition(this.state, AUDIT_STATES.IN_PROGRESS);
    this.isWarehouseFrozen = true;
  }

  /**
   * Submits a blind count entry
   * @param {AuditCountEntry} entry
   */
  submitCountEntry(entry) {
    if (this.state !== AUDIT_STATES.IN_PROGRESS && this.state !== AUDIT_STATES.RECONCILIATION) {
      throw new Error(`Cannot submit count entry when audit session state is ${this.state}`);
    }
    const validEntry = entry instanceof AuditCountEntry ? entry : new AuditCountEntry(entry);
    this.countEntries.push(validEntry);
  }

  /**
   * Moves session into reconciliation state
   */
  beginReconciliation() {
    this.state = AuditSessionStateMachine.transition(this.state, AUDIT_STATES.RECONCILIATION);
  }

  /**
   * Closes audit session and unfreezes the warehouse
   */
  closeSession() {
    this.state = AuditSessionStateMachine.transition(this.state, AUDIT_STATES.CLOSED);
    this.isWarehouseFrozen = false;
  }
}

module.exports = { AnnualAuditSession };
