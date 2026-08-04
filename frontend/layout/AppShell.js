import { AuthContext } from '../auth/AuthContext.js';
import { attachStyles } from '../design-system/utils/styles.js';
import '../design-system/index.js';

// Navigation items manifest with required permissions
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '#/dashboard', section: 'Overview', perm: 'dashboard:read' },
  { id: 'inventory', label: 'Stock & Inventory', icon: '📦', path: '#/inventory', section: 'Core Management', perm: 'inventory:read' },
  { id: 'inbound', label: 'Inbound Shipments', icon: '📥', path: '#/inbound', section: 'Core Management', perm: 'inbound:read' },
  { id: 'outbound', label: 'Outbound Orders', icon: '📤', path: '#/outbound', section: 'Core Management', perm: 'outbound:read' },
  { id: 'bins', label: 'Bins & Zones', icon: '🏬', path: '#/bins', section: 'Core Management', perm: 'bins:read' },
  { id: 'reports', label: 'Analytics & Reports', icon: '📈', path: '#/reports', section: 'Insights', perm: 'reports:read' },
  { id: 'settings', label: 'System Settings', icon: '⚙️', path: '#/settings', section: 'Administration', perm: 'settings:read' },
  { id: 'users', label: 'User Management', icon: '👥', path: '#/users', section: 'Administration', perm: 'users:manage' },
];

const CSS = `
  :host {
    display: block;
    min-height: 100vh;
    background: var(--color-bg-canvas, #ffffff);
    color: var(--color-text-primary, #18181b);
    font-family: var(--font-sans, sans-serif);
  }

  .app-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    width: 100%;
  }

  .shell-header {
    height: 60px;
    background: var(--color-bg-surface, #ffffff);
    border-bottom: 1px solid var(--color-border-default, #e4e4e7);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-4, 16px);
    gap: var(--space-3, 12px);
    position: sticky;
    top: 0;
    z-index: var(--z-sticky, 1100);
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
  }

  .warehouse-selector {
    min-width: 160px;
  }

  .header-center {
    flex: 1;
    max-width: 360px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
  }

  .user-profile-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    background: transparent;
    border: none;
    padding: 4px 8px;
    border-radius: var(--radius-md, 8px);
    cursor: pointer;
    color: var(--color-text-primary, #18181b);
    transition: background var(--duration-fast, 120ms) ease;
  }
  .user-profile-btn:hover { background: var(--color-bg-muted, #f4f4f5); }

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-full, 9999px);
    background: var(--color-primary-subtle, #eef2ff);
    color: var(--color-primary, #4f46e5);
    font-weight: var(--font-weight-semibold, 600);
    font-size: var(--text-sm, 0.8125rem);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .user-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  .user-name { font-size: var(--text-xs, 0.75rem); font-weight: var(--font-weight-medium, 500); }
  .user-role-label { font-size: var(--text-2xs, 0.6875rem); color: var(--color-text-tertiary, #a1a1aa); text-transform: capitalize; }

  .user-dropdown {
    position: absolute;
    top: 52px;
    right: 16px;
    width: 220px;
    background: var(--color-bg-surface, #ffffff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--shadow-lg, 0 12px 20px -4px rgb(15 15 20 / 0.10));
    padding: var(--space-2, 8px);
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 4px);
    z-index: var(--z-dropdown, 1000);
  }
  .user-dropdown[hidden] { display: none !important; }

  .dropdown-header {
    padding: var(--space-2, 8px);
    border-bottom: 1px solid var(--color-border-subtle, #f4f4f5);
    margin-bottom: var(--space-1, 4px);
  }
  .dropdown-user-name { font-weight: var(--font-weight-semibold, 600); font-size: var(--text-sm, 0.8125rem); }
  .dropdown-user-email { font-size: var(--text-xs, 0.75rem); color: var(--color-text-tertiary, #a1a1aa); }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    width: 100%;
    padding: var(--space-2, 8px);
    border: none;
    background: transparent;
    border-radius: var(--radius-sm, 6px);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-text-primary, #18181b);
    cursor: pointer;
    text-align: left;
  }
  .dropdown-item:hover { background: var(--color-bg-muted, #f4f4f5); }
  .dropdown-item.danger { color: var(--color-danger, #dc2626); }

  .shell-sidebar {
    background: var(--color-bg-subtle, #fafafa);
    border-right: 1px solid var(--color-border-default, #e4e4e7);
    display: flex;
    flex-direction: column;
    transition: width var(--duration-base, 180ms) var(--ease-standard, ease);
  }

  .sidebar-header {
    height: 60px;
    padding: 0 var(--space-4, 16px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border-subtle, #f4f4f5);
  }

  .brand-logo {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    font-weight: var(--font-weight-bold, 700);
    font-size: var(--text-lg, 1rem);
    color: var(--color-primary, #4f46e5);
    text-decoration: none;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm, 6px);
    background: var(--color-primary, #4f46e5);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4, 16px) var(--space-2, 8px);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 16px);
  }

  .nav-section-title {
    font-size: var(--text-2xs, 0.6875rem);
    font-weight: var(--font-weight-semibold, 600);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-tertiary, #a1a1aa);
    padding: 0 var(--space-3, 12px);
    margin-bottom: var(--space-1, 4px);
  }

  .nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .nav-item-link {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-md, 8px);
    color: var(--color-text-secondary, #52525b);
    text-decoration: none;
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-weight-medium, 500);
    transition: background var(--duration-fast, 120ms) ease, color var(--duration-fast, 120ms) ease;
  }
  .nav-item-link:hover { background: var(--color-bg-muted, #f4f4f5); color: var(--color-text-primary, #18181b); }
  .nav-item-link[aria-current='page'] { background: var(--color-primary-subtle, #eef2ff); color: var(--color-primary, #4f46e5); }

  .nav-icon { font-size: 1.1rem; width: 20px; text-align: center; flex-shrink: 0; }
  .nav-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Collapsed Rail State */
  :host([collapsed]) .shell-sidebar { width: 64px !important; }
  :host([collapsed]) .brand-name,
  :host([collapsed]) .nav-label,
  :host([collapsed]) .nav-section-title { display: none !important; }
  :host([collapsed]) .nav-item-link { justify-content: center; padding: var(--space-2, 8px); }

  .shell-main {
    flex: 1;
    padding: var(--space-6, 24px);
    background: var(--color-bg-canvas, #ffffff);
    overflow-y: auto;
  }

  /* Bottom Tab Navigation Bar for Mobile (< 768px) */
  .bottom-tab-bar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: var(--color-bg-surface, #ffffff);
    border-top: 1px solid var(--color-border-default, #e4e4e7);
    z-index: var(--z-sticky, 1100);
    justify-content: space-around;
    align-items: center;
  }
  .tab-bar-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    color: var(--color-text-secondary, #52525b);
    text-decoration: none;
    font-size: var(--text-2xs, 0.6875rem);
    padding: 4px;
  }
  .tab-bar-item[aria-current='page'] { color: var(--color-primary, #4f46e5); }

  /* Responsive Grid Breakdown */
  @media (max-width: 767px) {
    .shell-sidebar { display: none; }
    .rail-toggle-btn { display: none; }
  }
  @media (min-width: 768px) {
    .bottom-tab-bar { display: none; }
    .mobile-menu-btn { display: none; }
    .app-shell {
      display: grid;
      grid-template-columns: var(--sidebar-width, 240px) 1fr;
      grid-template-rows: 60px 1fr;
      grid-template-areas:
        "sidebar header"
        "sidebar main";
    }
    :host([collapsed]) .app-shell { grid-template-columns: 64px 1fr; }
    .shell-header { grid-area: header; }
    .shell-sidebar { grid-area: sidebar; display: flex; height: 100vh; position: sticky; top: 0; width: var(--sidebar-width, 240px); }
    .shell-main { grid-area: main; }
  }
  @media (min-width: 1024px) {
    .shell-main { padding: var(--space-8, 32px); }
  }
  @media (min-width: 1440px) {
    .shell-main-inner { max-width: 1400px; margin: 0 auto; }
  }

  /* Skeleton state overrides */
  .skeleton-bar { display: flex; align-items: center; gap: var(--space-3, 12px); width: 100%; }
`;

const TEMPLATE = `
  <div class="app-shell" part="shell">
    <!-- Header -->
    <header class="shell-header" part="header">
      <div class="header-left">
        <wms-button class="mobile-menu-btn" variant="ghost" size="sm" aria-label="Toggle menu">☰</wms-button>
        <select class="warehouse-selector" id="warehouse-select" aria-label="Select Active Warehouse">
        </select>
      </div>

      <div class="header-center">
        <wms-input class="global-search" size="sm" placeholder="Search SKUs, orders, bins..."></wms-input>
      </div>

      <div class="header-right">
        <wms-button class="notification-btn" variant="ghost" size="sm" aria-label="Notifications">
          🔔 <wms-badge class="notification-badge" variant="danger" size="sm">3</wms-badge>
        </wms-button>

        <div class="user-menu-container">
          <button class="user-profile-btn" id="user-menu-trigger" type="button" aria-expanded="false" aria-label="User menu">
            <div class="user-avatar" id="user-avatar-initials">KV</div>
            <div class="user-meta">
              <span class="user-name" id="user-display-name">Katia Vance</span>
              <span class="user-role-label" id="user-display-role">manager</span>
            </div>
          </button>

          <div class="user-dropdown" id="user-dropdown-menu" hidden>
            <div class="dropdown-header">
              <div class="dropdown-user-name" id="dropdown-name">Katia Vance</div>
              <div class="dropdown-user-email" id="dropdown-email">katia.vance@wms.internal</div>
            </div>
            <button class="dropdown-item" id="menu-theme-toggle" type="button">🌙 Toggle Theme</button>
            <button class="dropdown-item danger" id="menu-logout" type="button">🚪 Log Out</button>
          </div>
        </div>
      </div>
    </header>

    <!-- Sidebar -->
    <aside class="shell-sidebar" part="sidebar">
      <div class="sidebar-header">
        <a href="#/" class="brand-logo">
          <span class="brand-icon">📦</span>
          <span class="brand-name">WMS Cloud</span>
        </a>
        <wms-button class="rail-toggle-btn" id="rail-toggle" variant="ghost" size="sm" aria-label="Toggle sidebar rail">
          ‹
        </wms-button>
      </div>

      <nav class="sidebar-nav" part="nav" id="sidebar-nav-container">
        <!-- Rendered dynamically or skeleton -->
      </nav>
    </aside>

    <!-- Main Content Slot -->
    <main class="shell-main" part="main">
      <div class="shell-main-inner" id="main-content-area">
        <slot></slot>
      </div>
    </main>

    <!-- Mobile Bottom Tab Bar -->
    <nav class="bottom-tab-bar" part="bottom-nav" id="bottom-tab-bar-container">
      <!-- Mobile tabs rendered dynamically -->
    </nav>
  </div>
`;

export class WmsAppShell extends HTMLElement {
  static get observedAttributes() {
    return ['loading', 'collapsed', 'current-route'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-app-shell', CSS);
    root.innerHTML = TEMPLATE;

    this._navContainer = root.getElementById('sidebar-nav-container');
    this._bottomTabContainer = root.getElementById('bottom-tab-bar-container');
    this._warehouseSelect = root.getElementById('warehouse-select');
    this._userMenuTrigger = root.getElementById('user-menu-trigger');
    this._userDropdownMenu = root.getElementById('user-dropdown-menu');
    this._railToggle = root.getElementById('rail-toggle');
    this._mainContentArea = root.getElementById('main-content-area');

    this._unsubscribeAuth = null;

    // Bind event handlers
    this._onUserMenuClick = this._onUserMenuClick.bind(this);
    this._onRailToggleClick = this._onRailToggleClick.bind(this);
    this._onWarehouseChange = this._onWarehouseChange.bind(this);
    this._onLogout = this._onLogout.bind(this);
    this._onDocumentClick = this._onDocumentClick.bind(this);
  }

  connectedCallback() {
    // Read persisted rail collapse state from localStorage or cookie
    this._initRailState();

    // Listen to AuthContext changes
    this._unsubscribeAuth = AuthContext.subscribe(() => this._render());

    // Event listeners
    this._userMenuTrigger.addEventListener('click', this._onUserMenuClick);
    this._railToggle.addEventListener('click', this._onRailToggleClick);
    this._warehouseSelect.addEventListener('change', this._onWarehouseChange);
    this.shadowRoot.getElementById('menu-logout').addEventListener('click', this._onLogout);
    document.addEventListener('click', this._onDocumentClick);

    this._render();
  }

  disconnectedCallback() {
    if (this._unsubscribeAuth) this._unsubscribeAuth();
    document.removeEventListener('click', this._onDocumentClick);
  }

  attributeChangedCallback(name) {
    if (name === 'collapsed') {
      const isCollapsed = this.hasAttribute('collapsed');
      this._railToggle.textContent = isCollapsed ? '›' : '‹';
    }
    this._render();
  }

  get loading() { return this.hasAttribute('loading'); }
  set loading(val) { this.toggleAttribute('loading', Boolean(val)); }

  get collapsed() { return this.hasAttribute('collapsed'); }
  set collapsed(val) {
    this.toggleAttribute('collapsed', Boolean(val));
    this._saveRailState(Boolean(val));
  }

  get currentRoute() { return this.getAttribute('current-route') || '#/dashboard'; }
  set currentRoute(val) { this.setAttribute('current-route', val); }

  _initRailState() {
    let collapsed = false;
    try {
      const stored = localStorage.getItem('wms-sidebar-collapsed');
      if (stored !== null) {
        collapsed = stored === 'true';
      } else {
        const match = document.cookie.match(/(?:^|; )wms_sidebar_collapsed=([^;]*)/);
        if (match) collapsed = match[1] === 'true';
      }
    } catch {
      // Fallback if storage access is restricted
    }
    if (collapsed) this.setAttribute('collapsed', '');
  }

  _saveRailState(collapsed) {
    try {
      localStorage.setItem('wms-sidebar-collapsed', String(collapsed));
      document.cookie = `wms_sidebar_collapsed=${collapsed}; path=/; max-age=31536000`;
    } catch {
      // Ignore storage errors
    }
  }

  _onRailToggleClick() {
    this.collapsed = !this.collapsed;
  }

  _onUserMenuClick(e) {
    e.stopPropagation();
    const isHidden = this._userDropdownMenu.hasAttribute('hidden');
    if (isHidden) {
      this._userDropdownMenu.removeAttribute('hidden');
      this._userMenuTrigger.setAttribute('aria-expanded', 'true');
    } else {
      this._userDropdownMenu.setAttribute('hidden', '');
      this._userMenuTrigger.setAttribute('aria-expanded', 'false');
    }
  }

  _onDocumentClick(e) {
    if (!e.composedPath().includes(this._userMenuTrigger) && !e.composedPath().includes(this._userDropdownMenu)) {
      this._userDropdownMenu.setAttribute('hidden', '');
      this._userMenuTrigger.setAttribute('aria-expanded', 'false');
    }
  }

  _onWarehouseChange(e) {
    AuthContext.setActiveWarehouse(e.target.value);
  }

  _onLogout() {
    AuthContext.logout();
    this.dispatchEvent(new CustomEvent('wms-logout', { bubbles: true, composed: true }));
  }

  _render() {
    const user = AuthContext.getUser();
    const activeWh = AuthContext.getActiveWarehouse();
    const warehouses = AuthContext.getWarehouses();
    const permissions = AuthContext.getPermissions();

    // Populate user info
    if (user) {
      const initials = user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
      this.shadowRoot.getElementById('user-avatar-initials').textContent = initials;
      this.shadowRoot.getElementById('user-display-name').textContent = user.name;
      this.shadowRoot.getElementById('user-display-role').textContent = user.role;
      this.shadowRoot.getElementById('dropdown-name').textContent = user.name;
      this.shadowRoot.getElementById('dropdown-email').textContent = user.email;
    }

    // Populate warehouse selector
    this._warehouseSelect.innerHTML = warehouses.map((w) => `
      <option value="${w.id}" ${w.id === activeWh.id ? 'selected' : ''}>${w.name}</option>
    `).join('');

    // If in skeleton loading state
    if (this.loading) {
      this._renderSkeleton();
      return;
    }

    // Filter nav items by AuthContext permissions
    const visibleItems = NAV_ITEMS.filter((item) => !item.perm || permissions.has(item.perm));

    // Group nav items by section
    const sections = {};
    for (const item of visibleItems) {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    }

    // Render sidebar navigation
    const currentRoute = this.currentRoute;
    this._navContainer.innerHTML = Object.entries(sections).map(([sectionTitle, items]) => `
      <div class="nav-section">
        <div class="nav-section-title">${sectionTitle}</div>
        <ul class="nav-list">
          ${items.map((item) => {
            const isActive = currentRoute === item.path || currentRoute.startsWith(item.path);
            return `
              <li>
                <a href="${item.path}" class="nav-item-link" ${isActive ? 'aria-current="page"' : ''}>
                  <span class="nav-icon">${item.icon}</span>
                  <span class="nav-label">${item.label}</span>
                </a>
              </li>
            `;
          }).join('')}
        </ul>
      </div>
    `).join('');

    // Render mobile bottom tab bar (top 4 items)
    this._bottomTabContainer.innerHTML = visibleItems.slice(0, 4).map((item) => {
      const isActive = currentRoute === item.path;
      return `
        <a href="${item.path}" class="tab-bar-item" ${isActive ? 'aria-current="page"' : ''}>
          <span class="nav-icon">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </a>
      `;
    }).join('');
  }

  _renderSkeleton() {
    this._navContainer.innerHTML = `
      <div style="padding: 12px; display: flex; flex-direction: column; gap: 16px;">
        <wms-skeleton variant="text" lines="1" width="60%"></wms-skeleton>
        <wms-skeleton variant="rect" height="36px"></wms-skeleton>
        <wms-skeleton variant="rect" height="36px"></wms-skeleton>
        <wms-skeleton variant="text" lines="1" width="40%"></wms-skeleton>
        <wms-skeleton variant="rect" height="36px"></wms-skeleton>
        <wms-skeleton variant="rect" height="36px"></wms-skeleton>
      </div>
    `;
  }
}

customElements.define('wms-app-shell', WmsAppShell);
