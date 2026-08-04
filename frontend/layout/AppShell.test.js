import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Node environment DOM mocks
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
if (typeof globalThis.document === 'undefined') {
  globalThis.document = { cookie: '' };
}

const { AuthContext } = await import('../auth/AuthContext.js');
const { WmsAppShell } = await import('./AppShell.js');

describe('WMS Application Shell — AuthContext & AppShell', () => {
  describe('AuthContext Manager', () => {
    it('provides user, active warehouse, and permissions snapshot', () => {
      const user = AuthContext.getUser();
      assert.equal(typeof user.name, 'string');
      assert.equal(user.role, 'manager');

      const warehouse = AuthContext.getActiveWarehouse();
      assert.equal(typeof warehouse.id, 'string');

      const permissions = AuthContext.getPermissions();
      assert.ok(permissions.has('inventory:read'));
    });

    it('filters permissions correctly based on role', () => {
      AuthContext.setRole('viewer');
      assert.equal(AuthContext.hasPermission('inventory:read'), true);
      assert.equal(AuthContext.hasPermission('users:manage'), false);

      AuthContext.setRole('admin');
      assert.equal(AuthContext.hasPermission('users:manage'), true);
      assert.equal(AuthContext.hasPermission('settings:write'), true);

      // Restore to manager
      AuthContext.setRole('manager');
    });

    it('updates active warehouse and notifies subscribers', () => {
      let notified = false;
      const unsubscribe = AuthContext.subscribe((state) => {
        notified = true;
        assert.equal(state.activeWarehouse.id, 'wh-west');
      });

      AuthContext.setActiveWarehouse('wh-west');
      assert.equal(notified, true);
      assert.equal(AuthContext.getActiveWarehouse().id, 'wh-west');

      unsubscribe();
      // Restore default
      AuthContext.setActiveWarehouse('wh-east');
    });
  });

  describe('WmsAppShell Web Component', () => {
    it('registers wms-app-shell custom element', () => {
      assert.equal(typeof WmsAppShell, 'function');
      assert.equal(customElements.get('wms-app-shell'), WmsAppShell);
    });

    it('defines valid observedAttributes', () => {
      assert.deepEqual(WmsAppShell.observedAttributes, ['loading', 'collapsed', 'current-route']);
    });
  });
});
