/**
 * @typedef {Object} ApiClientOptions
 * @property {string} [baseUrl]
 * @property {Function} [getToken]
 * @property {Function} [onUnauthorized]
 */

/**
 * ApiClient wrapping native fetch with automatic JWT attachment,
 * 401 refresh-and-retry queue logic, request cancellation via AbortController,
 * and 1:1 alignment with backend application use-cases.
 */
export class ApiClient {
  /**
   * @param {ApiClientOptions} [options]
   */
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '/api';
    this.getToken = options.getToken || (() => localStorage.getItem('wms_jwt_token'));
    this.setToken = (token) => localStorage.setItem('wms_jwt_token', token);
    this.onUnauthorized = options.onUnauthorized || (() => {});

    this._pendingControllers = new Map();
    this._isRefreshing = false;
    this._refreshQueue = [];
  }

  /**
   * Cancels in-flight requests for a given route key or all if omitted
   * @param {string} [routeKey]
   */
  cancelPendingRequests(routeKey) {
    if (routeKey) {
      const controller = this._pendingControllers.get(routeKey);
      if (controller) {
        controller.abort();
        this._pendingControllers.delete(routeKey);
      }
    } else {
      for (const [key, controller] of this._pendingControllers.entries()) {
        controller.abort();
        this._pendingControllers.delete(key);
      }
    }
  }

  /**
   * Internal fetch wrapper with token injection, AbortController, and 401 retry handling
   * @param {string} endpoint
   * @param {RequestInit} [init]
   * @param {string} [routeKey]
   */
  async request(endpoint, init = {}, routeKey) {
    const url = `${this.baseUrl}${endpoint}`;

    // Manage AbortController for request cancellation
    const key = routeKey || endpoint;
    if (this._pendingControllers.has(key)) {
      this._pendingControllers.get(key).abort();
    }
    const controller = new AbortController();
    this._pendingControllers.set(key, controller);

    const headers = new Headers(init.headers || {});
    headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config = {
      ...init,
      headers,
      signal: controller.signal,
    };

    try {
      let response = await fetch(url, config);
      this._pendingControllers.delete(key);

      if (response.status === 401) {
        // Handle 401 Token Refresh
        const refreshedToken = await this._handleTokenRefresh();
        if (refreshedToken) {
          headers.set('Authorization', `Bearer ${refreshedToken}`);
          response = await fetch(url, { ...config, headers });
        } else {
          this.onUnauthorized();
          throw new Error('Unauthorized — session expired');
        }
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorBody.message || `API Error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`Request to ${endpoint} cancelled via AbortController`);
      }
      throw err;
    }
  }

  async _handleTokenRefresh() {
    if (this._isRefreshing) {
      return new Promise((resolve) => this._refreshQueue.push(resolve));
    }

    this._isRefreshing = true;
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error('Token refresh failed');
      const data = await res.json();
      this.setToken(data.token);

      for (const resolve of this._refreshQueue) {
        resolve(data.token);
      }
      this._refreshQueue = [];
      return data.token;
    } catch {
      this._refreshQueue = [];
      return null;
    } finally {
      this._isRefreshing = false;
    }
  }

  // =========================================================================
  // Backend Use-Case Mirrored Methods (1:1 with Application Layer)
  // =========================================================================

  /**
   * AdjustStockUseCase 1:1 mirror
   * @param {string} sku
   * @param {number} delta
   * @param {string} reason
   */
  async adjustStock(sku, delta, reason) {
    return this.request('/inventory/adjust-stock', {
      method: 'POST',
      body: JSON.stringify({ sku, delta, reason }),
    }, 'inventory-adjust');
  }

  /**
   * GetInventoryQuery 1:1 mirror
   * @param {Object} [params]
   */
  async getInventory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/inventory?${query}`, { method: 'GET' }, 'inventory-list');
  }

  /**
   * GetOrdersQuery 1:1 mirror
   * @param {Object} [params]
   */
  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/orders?${query}`, { method: 'GET' }, 'orders-list');
  }

  /**
   * UpdateOrderStatusUseCase 1:1 mirror
   * @param {string} orderId
   * @param {string} status
   */
  async updateOrderStatus(orderId, status) {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, `order-status-${orderId}`);
  }

  /**
   * GetShipmentHistoryQuery 1:1 mirror
   * @param {string} shipmentId
   */
  async getShipmentHistory(shipmentId) {
    return this.request(`/shipments/${shipmentId}/history`, { method: 'GET' }, `shipment-${shipmentId}`);
  }
}

export const defaultApiClient = new ApiClient();
