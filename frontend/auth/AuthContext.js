// Lightweight, reactive AuthContext module managing user identity,
// active warehouse selection, and role-based permissions for frontend layout and views.

const ROLE_PERMISSIONS = {
  admin: new Set([
    'dashboard:read',
    'inventory:read',
    'inventory:write',
    'inbound:read',
    'inbound:write',
    'outbound:read',
    'outbound:write',
    'bins:read',
    'bins:write',
    'reports:read',
    'reports:export',
    'settings:read',
    'settings:write',
    'users:manage',
  ]),
  manager: new Set([
    'dashboard:read',
    'inventory:read',
    'inventory:write',
    'inbound:read',
    'inbound:write',
    'outbound:read',
    'outbound:write',
    'bins:read',
    'bins:write',
    'reports:read',
    'reports:export',
  ]),
  clerk: new Set([
    'dashboard:read',
    'inventory:read',
    'inventory:write',
    'inbound:read',
    'outbound:read',
    'bins:read',
  ]),
  viewer: new Set([
    'dashboard:read',
    'inventory:read',
    'reports:read',
  ]),
};

class AuthContextManager {
  constructor() {
    this._listeners = new Set();
    this._warehouses = [
      { id: 'wh-east', name: 'DC-East (Main)', code: 'DCE' },
      { id: 'wh-west', name: 'DC-West Regional', code: 'DCW' },
      { id: 'wh-central', name: 'Central Logistics Hub', code: 'CLH' },
    ];

    this._state = {
      user: {
        id: 'usr-9012',
        name: 'Katia Vance',
        email: 'katia.vance@wms.internal',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        role: 'manager',
      },
      activeWarehouse: this._warehouses[0],
      permissions: new Set(ROLE_PERMISSIONS.manager),
      authenticated: true,
    };
  }

  getUser() {
    return { ...this._state.user };
  }

  getWarehouses() {
    return [...this._warehouses];
  }

  getActiveWarehouse() {
    return { ...this._state.activeWarehouse };
  }

  setActiveWarehouse(warehouseId) {
    const found = this._warehouses.find((w) => w.id === warehouseId || w.code === warehouseId);
    if (found) {
      this._state.activeWarehouse = found;
      this._notify();
    }
  }

  getPermissions() {
    return new Set(this._state.permissions);
  }

  hasPermission(permission) {
    if (!permission) return true;
    return this._state.permissions.has(permission);
  }

  setRole(roleName) {
    const roleKey = roleName ? roleName.toLowerCase() : 'viewer';
    const perms = ROLE_PERMISSIONS[roleKey] || ROLE_PERMISSIONS.viewer;
    this._state.user.role = roleKey;
    this._state.permissions = new Set(perms);
    this._notify();
  }

  logout() {
    this._state.authenticated = false;
    this._state.user = null;
    this._state.permissions = new Set();
    this._notify();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    for (const listener of this._listeners) {
      try {
        listener(this._getStateSnapshot());
      } catch (err) {
        console.error('AuthContext listener error:', err);
      }
    }
  }

  _getStateSnapshot() {
    return {
      user: this.getUser(),
      activeWarehouse: this.getActiveWarehouse(),
      permissions: this.getPermissions(),
      authenticated: this._state.authenticated,
    };
  }
}

export const AuthContext = new AuthContextManager();
