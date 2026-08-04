'use strict';

/**
 * Domain error thrown when stock movement is attempted during an active warehouse audit freeze.
 */
class WarehouseFrozenError extends Error {
  constructor(warehouseId, auditSessionId) {
    super(`Stock movement blocked: Warehouse ${warehouseId} is currently FROZEN for Annual Audit Session ${auditSessionId}`);
    this.name = 'WarehouseFrozenError';
    this.warehouseId = warehouseId;
    this.auditSessionId = auditSessionId;
  }
}

/**
 * WarehouseFreezeGuard Service
 * Domain guard checked by AdjustStockUseCase and TransferStockUseCase
 * to block stock movements when an active audit session is frozen.
 */
class WarehouseFreezeGuard {
  /**
   * @param {Object} auditRepository
   */
  constructor(auditRepository) {
    this.auditRepository = auditRepository;
  }

  /**
   * Asserts that the warehouse is NOT frozen. Throws WarehouseFrozenError if frozen.
   * @param {string} warehouseId
   */
  async assertNotFrozen(warehouseId) {
    if (!warehouseId) return;

    const activeSession = await this.auditRepository.findActiveFrozenSession(warehouseId);
    if (activeSession && activeSession.isWarehouseFrozen) {
      throw new WarehouseFrozenError(warehouseId, activeSession.id);
    }
  }
}

module.exports = { WarehouseFreezeGuard, WarehouseFrozenError };
