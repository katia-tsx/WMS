'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { AnnualAuditSession } = require('../../../domain/inventory/entities/AnnualAuditSession');
const { AuditCountEntry } = require('../../../domain/inventory/value-objects/AuditCountEntry');
const { AuditSessionStateMachine, AUDIT_STATES } = require('../../../domain/inventory/services/AuditSessionStateMachine');
const { WarehouseFreezeGuard, WarehouseFrozenError } = require('../../../domain/inventory/services/WarehouseFreezeGuard');
const { VarianceReconciliationService } = require('../../../domain/inventory/services/VarianceReconciliationService');
const { AuditReportGenerator } = require('../../../domain/inventory/services/AuditReportGenerator');

const { CreateAuditSessionUseCase } = require('./CreateAuditSessionUseCase');
const { SubmitBlindCountUseCase } = require('./SubmitBlindCountUseCase');
const { ReconcileAuditSessionUseCase } = require('./ReconcileAuditSessionUseCase');

const { SimpleMovingAverageStrategy } = require('../analytics/strategies/SimpleMovingAverageStrategy');
const { ExponentialSmoothingStrategy } = require('../analytics/strategies/ExponentialSmoothingStrategy');
const { ForecastDemandUseCase } = require('../analytics/ForecastDemandUseCase');
const { CalculateInventoryTurnoverUseCase } = require('../analytics/CalculateInventoryTurnoverUseCase');
const { CalculateDeadStockUseCase } = require('../analytics/CalculateDeadStockUseCase');

describe('Annual Audit Session Aggregate & State Machine', () => {
  it('enforces valid state machine transitions PLANNED -> IN_PROGRESS -> RECONCILIATION -> CLOSED', () => {
    assert.equal(AuditSessionStateMachine.transition(AUDIT_STATES.PLANNED, AUDIT_STATES.IN_PROGRESS), AUDIT_STATES.IN_PROGRESS);
    assert.equal(AuditSessionStateMachine.transition(AUDIT_STATES.IN_PROGRESS, AUDIT_STATES.RECONCILIATION), AUDIT_STATES.RECONCILIATION);
    assert.equal(AuditSessionStateMachine.transition(AUDIT_STATES.RECONCILIATION, AUDIT_STATES.CLOSED), AUDIT_STATES.CLOSED);

    assert.throws(() => AuditSessionStateMachine.transition(AUDIT_STATES.PLANNED, AUDIT_STATES.CLOSED));
  });

  it('manages freeze state and blind count entries', () => {
    const session = new AnnualAuditSession({ id: 'audit-001', warehouseId: 'wh-east' });
    assert.equal(session.state, 'PLANNED');
    assert.equal(session.isWarehouseFrozen, false);

    session.startAudit();
    assert.equal(session.state, 'IN_PROGRESS');
    assert.equal(session.isWarehouseFrozen, true);

    const entry = new AuditCountEntry({ operatorId: 'op-1', binId: 'A1', sku: 'WMS-1001', count: 100 });
    session.submitCountEntry(entry);
    assert.equal(session.countEntries.length, 1);
  });
});

describe('WarehouseFreezeGuard & Stock Movement Blocking', () => {
  it('assertNotFrozen throws WarehouseFrozenError when an active audit session is frozen', async () => {
    const mockRepo = {
      findActiveFrozenSession: async (whId) => (whId === 'wh-frozen' ? { id: 'audit-99', isWarehouseFrozen: true } : null),
    };
    const guard = new WarehouseFreezeGuard(mockRepo);

    await assert.doesNotReject(() => guard.assertNotFrozen('wh-free'));
    await assert.rejects(() => guard.assertNotFrozen('wh-frozen'), WarehouseFrozenError);
  });
});

describe('VarianceReconciliationService & AuditReportGenerator', () => {
  it('reconciles matching counts and flags conflicting counts for 3rd recount', () => {
    const entries = [
      new AuditCountEntry({ operatorId: 'op1', binId: 'A1', sku: 'WMS-1', count: 50 }),
      new AuditCountEntry({ operatorId: 'op2', binId: 'A1', sku: 'WMS-1', count: 50 }),
      new AuditCountEntry({ operatorId: 'op1', binId: 'B1', sku: 'WMS-2', count: 10 }),
      new AuditCountEntry({ operatorId: 'op2', binId: 'B1', sku: 'WMS-2', count: 12 }),
    ];
    const expected = [
      { binId: 'A1', sku: 'WMS-1', expectedCount: 50, unitPrice: 10, zone: 'Zone A' },
      { binId: 'B1', sku: 'WMS-2', expectedCount: 10, unitPrice: 20, zone: 'Zone B' },
    ];

    const res = VarianceReconciliationService.reconcile(entries, expected);
    assert.equal(res.results.find((r) => r.sku === 'WMS-1').status, 'RECONCILED');
    assert.equal(res.results.find((r) => r.sku === 'WMS-2').status, 'NEEDS_RECOUNT');
    assert.equal(res.hasPendingRecounts, true);
  });

  it('generates valid printable HTML report string', () => {
    const html = AuditReportGenerator.generateHtmlReport({
      auditSessionId: 'audit-100',
      warehouseId: 'wh-east',
      totalVarianceValue: 120,
      zoneAccuracy: { 'Zone A': 98.5 },
      topDiscrepancies: [{ sku: 'WMS-1', binId: 'A1', expectedCount: 10, finalCount: 8, varianceQty: -2, varianceValue: 40 }],
      results: [],
    });

    assert.ok(html.includes('Annual Physical Inventory Audit Report'));
    assert.ok(html.includes('audit-100'));
    assert.ok(html.includes('$120.00'));
  });
});

describe('Audit Use Cases (Create, SubmitBlindCount, Reconcile)', () => {
  it('executes full audit workflow end-to-end', async () => {
    const sessions = new Map();
    const mockAuditRepo = {
      save: async (s) => sessions.set(s.id, s),
      findById: async (id) => sessions.get(id),
    };
    const mockInvRepo = {
      adjustStock: async () => {},
    };
    const mockUow = {
      execute: async (fn) => fn(),
    };

    const createUseCase = new CreateAuditSessionUseCase({ auditRepository: mockAuditRepo });
    const submitUseCase = new SubmitBlindCountUseCase({ auditRepository: mockAuditRepo });
    const reconcileUseCase = new ReconcileAuditSessionUseCase({
      auditRepository: mockAuditRepo,
      inventoryRepository: mockInvRepo,
      unitOfWork: mockUow,
    });

    const createRes = await createUseCase.execute({ warehouseId: 'wh-east', sessionId: 'audit-test' });
    assert.equal(createRes.state, 'IN_PROGRESS');
    assert.equal(createRes.isWarehouseFrozen, true);

    await submitUseCase.execute({ sessionId: 'audit-test', operatorId: 'op1', binId: 'A1', sku: 'SKU1', count: 100 });
    await submitUseCase.execute({ sessionId: 'audit-test', operatorId: 'op2', binId: 'A1', sku: 'SKU1', count: 100 });

    const recRes = await reconcileUseCase.execute({
      sessionId: 'audit-test',
      expectedStock: [{ binId: 'A1', sku: 'SKU1', expectedCount: 100, unitPrice: 10, zone: 'Zone A' }],
    });

    assert.equal(recRes.state, 'CLOSED');
    assert.equal(recRes.isWarehouseFrozen, false);
    assert.ok(recRes.htmlReport.includes('audit-test'));
  });
});

describe('Demand Forecasting Strategies & Analytics Use Cases', () => {
  it('SimpleMovingAverageStrategy computes moving averages', () => {
    const strategy = new SimpleMovingAverageStrategy(3);
    const forecast = strategy.forecast([10, 20, 30, 40], 2);
    assert.deepEqual(forecast, [30, 30]);
  });

  it('ExponentialSmoothingStrategy computes exponential smoothing', () => {
    const strategy = new ExponentialSmoothingStrategy(0.5);
    const forecast = strategy.forecast([10, 20, 30], 2);
    assert.equal(forecast[0] > 0, true);
  });

  it('ForecastDemandUseCase uses strategy port seamlessly', async () => {
    const useCase = new ForecastDemandUseCase({
      forecastingStrategy: new SimpleMovingAverageStrategy(3),
    });

    const res = await useCase.execute({ sku: 'WMS-1001', historicalDemand: [100, 110, 120], periods: 2 });
    assert.equal(res.sku, 'WMS-1001');
    assert.deepEqual(res.forecast, [110, 110]);
  });

  it('CalculateInventoryTurnoverUseCase computes turnover rate and DSI', async () => {
    const useCase = new CalculateInventoryTurnoverUseCase({ inventoryRepository: {} });
    const res = await useCase.execute({ cogs: 120000, avgInventoryValue: 24000 });
    assert.equal(res.turnoverRate, 5);
    assert.equal(res.daysSalesOfInventory, 73);
  });

  it('CalculateDeadStockUseCase identifies un-moved inventory', async () => {
    const mockInvRepo = {
      findAll: async () => [
        { sku: 'OLD-1', name: 'Old Item', quantity: 10, lastMovementDate: '2025-01-01', unitPrice: 5 },
        { sku: 'NEW-1', name: 'New Item', quantity: 50, lastMovementDate: new Date().toISOString(), unitPrice: 10 },
      ],
    };
    const useCase = new CalculateDeadStockUseCase({ inventoryRepository: mockInvRepo });
    const res = await useCase.execute({ thresholdDays: 90 });

    assert.equal(res.deadStockCount, 1);
    assert.equal(res.items[0].sku, 'OLD-1');
  });
});
