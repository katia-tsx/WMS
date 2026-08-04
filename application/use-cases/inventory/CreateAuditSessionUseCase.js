'use strict';

const { UseCase } = require('../UseCase');
const { AnnualAuditSession } = require('../../../domain/inventory/entities/AnnualAuditSession');

class CreateAuditSessionUseCase extends UseCase {
  constructor({ auditRepository }) {
    super();
    this.auditRepository = auditRepository;
  }

  async execute({ warehouseId, sessionId }) {
    if (!warehouseId) throw new Error('CreateAuditSessionUseCase requires warehouseId');

    const id = sessionId || `audit-${Date.now()}`;
    const session = new AnnualAuditSession({ id, warehouseId });

    // Freeze warehouse and start audit session
    session.startAudit();

    await this.auditRepository.save(session);
    return {
      sessionId: session.id,
      warehouseId: session.warehouseId,
      state: session.state,
      isWarehouseFrozen: session.isWarehouseFrozen,
    };
  }
}

module.exports = { CreateAuditSessionUseCase };
