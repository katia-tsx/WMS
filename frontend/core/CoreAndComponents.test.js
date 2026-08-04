import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Node environment mocks
if (typeof globalThis.HTMLElement === 'undefined') {
  globalThis.HTMLElement = class HTMLElement {};
}
if (typeof globalThis.customElements === 'undefined') {
  const registry = new Map();
  globalThis.customElements = {
    define: (name, constructor) => registry.set(name, constructor),
    get: (name) => registry.get(name),
  };
}
if (typeof globalThis.CSSStyleSheet === 'undefined') {
  globalThis.CSSStyleSheet = class CSSStyleSheet {
    replaceSync() {}
  };
}
if (typeof globalThis.Document === 'undefined') {
  globalThis.Document = class Document {};
  globalThis.Document.prototype.adoptedStyleSheets = [];
}
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
  };
}

const { createStore, shallowEqual } = await import('./Store.js');
const { InventoryStore } = await import('./stores/InventoryStore.js');
const { OrderStore } = await import('./stores/OrderStore.js');
const { ShipmentStore } = await import('./stores/ShipmentStore.js');
const { ApiClient } = await import('./ApiClient.js');
const { PropertyEqualsSpecification, AndSpecification } = await import('../components/wms-filter-bar.js');

describe('Frontend Core — Store & Selector Memoization', () => {
  it('correctly calculates shallow equality', () => {
    assert.equal(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' }), true);
    assert.equal(shallowEqual({ a: 1, b: 'x' }, { a: 1, b: 'y' }), false);
    assert.equal(shallowEqual({ a: 1 }, { a: 1, b: 2 }), false);
  });

  it('dispatches actions and updates state in custom Store', () => {
    const reducer = (state, action) => {
      if (action.type === 'INC') return { count: state.count + action.payload };
      return state;
    };
    const store = createStore(reducer, { count: 0 });

    assert.equal(store.getState().count, 0);
    store.dispatch({ type: 'INC', payload: 5 });
    assert.equal(store.getState().count, 5);
  });

  it('invokes select listener ONLY when selected slice changes', () => {
    const reducer = (state, action) => {
      if (action.type === 'SET_A') return { ...state, a: action.payload };
      if (action.type === 'SET_B') return { ...state, b: action.payload };
      return state;
    };
    const store = createStore(reducer, { a: 10, b: 20 });

    let callCount = 0;
    store.select((state) => ({ a: state.a }), () => {
      callCount++;
    });

    store.dispatch({ type: 'SET_B', payload: 99 });
    assert.equal(callCount, 0); // Selected slice `a` did not change!

    store.dispatch({ type: 'SET_A', payload: 50 });
    assert.equal(callCount, 1); // Selected slice `a` changed!
  });
});

describe('Frontend Core — Module Stores & ApiClient', () => {
  it('InventoryStore handles stock adjustment actions', () => {
    const initialQty = InventoryStore.getState().items[0].quantity;
    InventoryStore.dispatch({
      type: 'INVENTORY_ADJUST_STOCK',
      payload: { sku: 'WMS-1001', delta: -10 },
    });
    const nextQty = InventoryStore.getState().items[0].quantity;
    assert.equal(nextQty, initialQty - 10);
  });

  it('OrderStore handles moving cards across pipeline columns', () => {
    OrderStore.dispatch({
      type: 'ORDERS_MOVE_CARD',
      payload: { orderId: 'ORD-8801', targetStatus: 'PICKING' },
    });
    const order = OrderStore.getState().orders.find((o) => o.id === 'ORD-8801');
    assert.equal(order.status, 'PICKING');
  });

  it('ApiClient constructs with default options and supports AbortController cancellation', () => {
    const client = new ApiClient();
    assert.equal(typeof client.adjustStock, 'function');
    assert.equal(typeof client.getInventory, 'function');
    assert.equal(typeof client.cancelPendingRequests, 'function');

    // Test cancellation call without throwing
    assert.doesNotThrow(() => client.cancelPendingRequests());
  });
});

describe('Frontend Components — Specification Pattern Mirror', () => {
  it('evaluates PropertyEqualsSpecification correctly', () => {
    const spec = new PropertyEqualsSpecification('category', 'Packaging');
    assert.equal(spec.isSatisfiedBy({ category: 'Packaging' }), true);
    assert.equal(spec.isSatisfiedBy({ category: 'Supplies' }), false);
  });

  it('evaluates AndSpecification correctly', () => {
    const spec1 = new PropertyEqualsSpecification('category', 'Packaging');
    const spec2 = new PropertyEqualsSpecification('status', 'IN_STOCK');
    const combined = new AndSpecification(spec1, spec2);

    assert.equal(combined.isSatisfiedBy({ category: 'Packaging', status: 'IN_STOCK' }), true);
    assert.equal(combined.isSatisfiedBy({ category: 'Packaging', status: 'OUT_OF_STOCK' }), false);
  });
});
