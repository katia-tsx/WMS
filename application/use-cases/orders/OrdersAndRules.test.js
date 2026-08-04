'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { Order } = require('../../../domain/orders/entities/Order');
const { OrderLine } = require('../../../domain/orders/entities/OrderLine');
const { ShippingAddress } = require('../../../domain/orders/value-objects/ShippingAddress');
const { PickTask } = require('../../../domain/orders/value-objects/PickTask');
const { OrderStateMachine, InvalidOrderStateTransitionError } = require('../../../domain/orders/services/OrderStateMachine');
const { OrderAllocationService } = require('../../../domain/orders/services/OrderAllocationService');
const { OrderPriorityScorer } = require('../../../domain/orders/services/OrderPriorityScorer');
const { WavePlanningService } = require('../../../domain/orders/services/WavePlanningService');

const { MinimumOrderValueRule } = require('../../../domain/orders/rules/MinimumOrderValueRule');
const { RestrictedProductComboRule } = require('../../../domain/orders/rules/RestrictedProductComboRule');
const { CustomerCreditLimitRule } = require('../../../domain/orders/rules/CustomerCreditLimitRule');
const { ShippingAddressValidationRule } = require('../../../domain/orders/rules/ShippingAddressValidationRule');
const { OrderValidationChain } = require('../../../domain/orders/rules/OrderValidationChain');

const { SerpentineRouteStrategy } = require('./strategies/SerpentineRouteStrategy');
const { LargestGapRouteStrategy } = require('./strategies/LargestGapRouteStrategy');

const { CreateOrderUseCase } = require('./CreateOrderUseCase');
const { ConfirmOrderUseCase } = require('./ConfirmOrderUseCase');
const { AllocateOrderUseCase } = require('./AllocateOrderUseCase');
const { GeneratePickListUseCase } = require('./GeneratePickListUseCase');
const { CreatePickingWaveUseCase } = require('./CreatePickingWaveUseCase');

describe('Order Aggregate & State Machine', () => {
  it('enforces valid transitions and rejects invalid transitions with InvalidOrderStateTransitionError', () => {
    const order = new Order({
      id: 'ord-1',
      customerId: 'cust-100',
      shippingAddress: { street: '123 Main St', city: 'Dallas', state: 'TX', zipCode: '75001' },
    });

    assert.equal(order.state, 'DRAFT');
    order.confirm();
    assert.equal(order.state, 'CONFIRMED');

    order.allocate();
    assert.equal(order.state, 'ALLOCATED');

    order.startPicking();
    assert.equal(order.state, 'PICKING');

    order.pack();
    assert.equal(order.state, 'PACKED');

    order.ship();
    assert.equal(order.state, 'SHIPPED');

    order.deliver();
    assert.equal(order.state, 'DELIVERED');

    // Attempt invalid transition from DELIVERED -> DRAFT
    assert.throws(() => order.transitionTo('DRAFT'), InvalidOrderStateTransitionError);
  });

  it('allows side-branch transitions to CANCELLED or ON_HOLD', () => {
    const order = new Order({
      id: 'ord-2',
      customerId: 'cust-101',
      shippingAddress: { street: '456 Elm St', city: 'Austin', state: 'TX', zipCode: '78701' },
    });

    order.cancel();
    assert.equal(order.state, 'CANCELLED');
  });
});

describe('OrderAllocationService & PriorityScorer', () => {
  it('allocates stock to order lines and calculates backorders', () => {
    const order = new Order({
      id: 'ord-3',
      customerId: 'cust-102',
      lines: [
        new OrderLine({ id: 'l1', productSku: 'SKU-A', quantity: 10 }),
        new OrderLine({ id: 'l2', productSku: 'SKU-B', quantity: 5 }),
      ],
      shippingAddress: { street: '101 Pine St', city: 'Houston', state: 'TX', zipCode: '77001' },
    });

    const stockMap = new Map([
      ['SKU-A', 10],
      ['SKU-B', 2],
    ]);

    const res = OrderAllocationService.allocateOrder(order, stockMap);
    assert.equal(res.fullyAllocated, false);
    assert.equal(order.lines[0].status, 'ALLOCATED');
    assert.equal(order.lines[1].status, 'PARTIALLY_ALLOCATED');
    assert.equal(order.lines[1].backorderedQuantity, 3);
  });

  it('OrderPriorityScorer computes priority score based on SLA tier', () => {
    const vipOrder = new Order({
      id: 'ord-vip',
      customerId: 'cust-vip',
      slaTier: 'VIP',
      shippingAddress: { street: '1 VIP Way', city: 'Austin', state: 'TX', zipCode: '78701' },
    });

    const score = OrderPriorityScorer.calculateScore(vipOrder);
    assert.ok(score >= 100);
  });
});

describe('Picking Route Strategies & Wave Planning Service', () => {
  it('SerpentineRouteStrategy sorts tasks in alphabetical aisle order', () => {
    const strategy = new SerpentineRouteStrategy();
    const tasks = [
      new PickTask({ id: 't1', locationCode: 'C1-02', sku: 'SKU1', quantity: 5 }),
      new PickTask({ id: 't2', locationCode: 'A1-01', sku: 'SKU2', quantity: 2 }),
    ];
    const sorted = strategy.sortRoute(tasks);
    assert.equal(sorted[0].locationCode, 'A1-01');
  });

  it('WavePlanningService groups pending orders into picking wave', () => {
    const orders = [
      new Order({ id: 'o1', customerId: 'c1', lines: [{ id: 'l1', productSku: 'S1', quantity: 5 }], shippingAddress: { street: 'S', city: 'C', state: 'TX', zipCode: '75001' } }),
    ];

    const wave = WavePlanningService.planWave(orders);
    assert.equal(wave.ordersCount, 1);
    assert.ok(wave.waveId.startsWith('wave-'));
  });
});

describe('Business Rule Validation Engine', () => {
  it('MinimumOrderValueRule detects low order values', () => {
    const rule = new MinimumOrderValueRule();
    const lowOrder = new Order({
      id: 'o-low',
      customerId: 'c1',
      lines: [new OrderLine({ id: 'l1', productSku: 'S1', quantity: 1, unitPrice: 10 })],
      shippingAddress: { street: 'S', city: 'C', state: 'TX', zipCode: '75001' },
    });

    const v = rule.validate(lowOrder, { minimumOrderValue: 50 });
    assert.ok(v !== null);
    assert.equal(v.rule, 'MinimumOrderValueRule');
  });

  it('OrderValidationChain executes multiple rules and aggregates violations', async () => {
    const chain = new OrderValidationChain([
      new MinimumOrderValueRule(),
      new RestrictedProductComboRule(),
      new CustomerCreditLimitRule(),
      new ShippingAddressValidationRule(),
    ]);

    const invalidOrder = new Order({
      id: 'o-inv',
      customerId: 'c1',
      lines: [
        new OrderLine({ id: 'l1', productSku: 'HAZMAT-1', quantity: 1, unitPrice: 5 }),
        new OrderLine({ id: 'l2', productSku: 'FLAMMABLE-2', quantity: 1, unitPrice: 5 }),
      ],
      shippingAddress: { street: 'S', city: 'C', state: 'TX', zipCode: '75001' },
    });

    const violations = await chain.validate(invalidOrder, { minimumOrderValue: 50 });
    assert.ok(violations.length >= 2); // Minimum value violation + Hazardous combo violation
  });
});

describe('Order Use Cases (Create, Confirm, Allocate, PickList, Wave)', () => {
  it('executes full order fulfillment workflow end-to-end', async () => {
    const ordersMap = new Map();
    const mockOrderRepo = {
      save: async (o) => ordersMap.set(o.id, o),
      findById: async (id) => ordersMap.get(id),
    };
    const mockInvRepo = {
      findBySku: async (sku) => ({ sku, quantity: 100 }),
    };

    const createUseCase = new CreateOrderUseCase({ orderRepository: mockOrderRepo });
    const confirmUseCase = new ConfirmOrderUseCase({ orderRepository: mockOrderRepo });
    const allocateUseCase = new AllocateOrderUseCase({ orderRepository: mockOrderRepo, inventoryRepository: mockInvRepo });
    const pickListUseCase = new GeneratePickListUseCase({ orderRepository: mockOrderRepo });

    const createRes = await createUseCase.execute({
      orderId: 'ord-test',
      customerId: 'cust-1',
      slaTier: 'VIP',
      lines: [{ id: 'l1', productSku: 'WMS-1001', quantity: 10 }],
      shippingAddress: { street: '100 Test St', city: 'Dallas', state: 'TX', zipCode: '75001' },
    });
    assert.equal(createRes.success, true);

    await confirmUseCase.execute({ orderId: 'ord-test' });
    const allocRes = await allocateUseCase.execute({ orderId: 'ord-test' });
    assert.equal(allocRes.state, 'ALLOCATED');

    const pickRes = await pickListUseCase.execute({ orderId: 'ord-test' });
    assert.equal(pickRes.state, 'PICKING');
    assert.equal(pickRes.pickTasks.length, 1);
  });
});
