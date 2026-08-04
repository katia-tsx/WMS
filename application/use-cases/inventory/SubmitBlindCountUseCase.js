'use strict';

const { UseCase } = require('../UseCase');
const { AuditCountEntry } = require('../../../domain/inventory/value-objects/AuditCountEntry');

class SubmitBlindCountUseCase extends UseCase {
  constructor({ auditRepository }) {
    super();
    this.auditRepository = auditRepository;
  }

  async execute({ sessionId, operatorId, binId, sku, count, isRecount = false }) {
    const session = await this.auditRepository.findById(sessionId);
    if (!session) throw new Error(`Audit Session ${sessionId} not found`);

    const entry = new AuditCountEntry({
      operatorId,
      binId,
      sku,
      count,
      isRecount,
    });

    session.submitCountEntry(entry);
    await this.auditRepository.save(session);

    return {
      sessionId: session.id,
      submittedEntry: entry,
      totalEntries: session.countEntries.length,
    };
  }
}

module.exports = { SubmitBlindCountUseCase };
