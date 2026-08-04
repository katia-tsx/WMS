'use strict';

const { UseCase } = require('../UseCase');
const { VarianceReconciliationService } = require('../../../domain/inventory/services/VarianceReconciliationService');
const { AuditReportGenerator } = require('../../../domain/inventory/services/AuditReportGenerator');

class ReconcileAuditSessionUseCase extends UseCase {
  constructor({ auditRepository, inventoryRepository, unitOfWork }) {
    super();
    this.auditRepository = auditRepository;
    this.inventoryRepository = inventoryRepository;
    this.unitOfWork = unitOfWork;
  }

  async execute({ sessionId, expectedStock = [] }) {
    const session = await this.auditRepository.findById(sessionId);
    if (!session) throw new Error(`Audit session ${sessionId} not found`);

    session.beginReconciliation();

    // Perform variance reconciliation
    const reconciliation = VarianceReconciliationService.reconcile(session.countEntries, expectedStock);

    // Generate HTML report
    const htmlReport = AuditReportGenerator.generateHtmlReport({
      auditSessionId: session.id,
      warehouseId: session.warehouseId,
      totalVarianceValue: reconciliation.totalVarianceValue,
      zoneAccuracy: reconciliation.zoneAccuracy,
      topDiscrepancies: reconciliation.topDiscrepancies,
      results: reconciliation.results,
    });

    // If all counts reconciled without pending recounts, close session & apply final adjustments atomically
    if (!reconciliation.hasPendingRecounts) {
      await this.unitOfWork.execute(async () => {
        for (const res of reconciliation.results) {
          if (res.varianceQty !== 0) {
            await this.inventoryRepository.adjustStock(res.sku, res.varianceQty, `Annual Audit Reconciliation ${session.id}`);
          }
        }
        session.closeSession();
        await this.auditRepository.save(session);
      });
    } else {
      await this.auditRepository.save(session);
    }

    return {
      sessionId: session.id,
      state: session.state,
      isWarehouseFrozen: session.isWarehouseFrozen,
      reconciliation,
      htmlReport,
    };
  }
}

module.exports = { ReconcileAuditSessionUseCase };
