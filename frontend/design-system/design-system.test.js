import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Node test runner environment setup: mock Minimal Web Component APIs if running in pure Node environment
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

const {
  WmsButton,
  WmsInput,
  WmsBadge,
  WmsCard,
  WmsModal,
  WmsToast,
  WmsSkeleton,
} = await import('./index.js');

describe('WMS Design System — Module Exports & Custom Elements', () => {
  it('exports all 7 Web Component classes', () => {
    assert.equal(typeof WmsButton, 'function');
    assert.equal(typeof WmsInput, 'function');
    assert.equal(typeof WmsBadge, 'function');
    assert.equal(typeof WmsCard, 'function');
    assert.equal(typeof WmsModal, 'function');
    assert.equal(typeof WmsToast, 'function');
    assert.equal(typeof WmsSkeleton, 'function');
  });

  it('registers custom elements in the global customElements registry', () => {
    assert.equal(customElements.get('wms-button'), WmsButton);
    assert.equal(customElements.get('wms-input'), WmsInput);
    assert.equal(customElements.get('wms-badge'), WmsBadge);
    assert.equal(customElements.get('wms-card'), WmsCard);
    assert.equal(customElements.get('wms-modal'), WmsModal);
    assert.equal(customElements.get('wms-toast'), WmsToast);
    assert.equal(customElements.get('wms-skeleton'), WmsSkeleton);
  });

  it('defines valid observedAttributes for reactive components', () => {
    assert.deepEqual(WmsButton.observedAttributes, ['disabled', 'loading', 'type', 'variant', 'size', 'aria-label']);
    assert.deepEqual(WmsInput.observedAttributes, [
      'label', 'type', 'placeholder', 'value', 'hint', 'error',
      'disabled', 'readonly', 'required', 'size', 'name', 'aria-label',
    ]);
    assert.deepEqual(WmsBadge.observedAttributes, ['dot', 'variant', 'size']);
    assert.deepEqual(WmsCard.observedAttributes, ['interactive']);
    assert.deepEqual(WmsModal.observedAttributes, ['open', 'label']);
    assert.deepEqual(WmsToast.observedAttributes, ['variant']);
    assert.deepEqual(WmsSkeleton.observedAttributes, ['variant', 'width', 'height', 'lines']);
  });
});
