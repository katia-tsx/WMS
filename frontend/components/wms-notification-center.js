import { attachStyles } from '../design-system/utils/styles.js';
import '../design-system/components/wms-badge.js';

// <wms-notification-center>
// In-App Notification Center Web Component featuring bell badge count, dropdown, and mark-as-read.

const CSS = `
  :host {
    display: inline-block;
    position: relative;
    font-family: var(--font-sans, sans-serif);
  }

  .bell-btn {
    all: unset;
    cursor: pointer;
    position: relative;
    padding: var(--space-2, 8px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md, 6px);
    transition: background 120ms ease;
  }
  .bell-btn:hover { background: var(--color-bg-muted, #f4f4f5); }

  .badge-count {
    position: absolute;
    top: 2px;
    right: 2px;
  }

  .dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    width: 320px;
    background: var(--color-bg-surface, #ffffff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    z-index: 1000;
    margin-top: var(--space-2, 8px);
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3, 12px) var(--space-4, 16px);
    border-bottom: 1px solid var(--color-border-subtle, #f4f4f5);
    font-size: var(--text-sm, 0.8125rem);
    font-weight: 600;
  }

  .notif-list {
    max-height: 280px;
    overflow-y: auto;
  }

  .notif-item {
    padding: var(--space-3, 12px) var(--space-4, 16px);
    border-bottom: 1px solid var(--color-border-subtle, #f4f4f5);
    cursor: pointer;
    transition: background 120ms ease;
  }
  .notif-item:hover { background: var(--color-bg-subtle, #fafafa); }
  .notif-item.unread { background: rgba(79, 70, 229, 0.05); }

  .notif-title { font-weight: 600; font-size: 0.8125rem; }
  .notif-msg { font-size: 0.75rem; color: var(--color-text-secondary, #52525b); margin-top: 2px; }
  .mark-btn { all: unset; color: var(--color-primary, #4f46e5); font-size: 0.75rem; cursor: pointer; }
`;

export class WmsNotificationCenter extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-notification-center', CSS);

    root.innerHTML = `
      <button class="bell-btn" id="bell-button" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <wms-badge variant="danger" size="sm" class="badge-count" id="unread-badge">3</wms-badge>
      </button>

      <div class="dropdown" id="dropdown-menu" hidden>
        <div class="dropdown-header">
          <span>Notifications</span>
          <button class="mark-btn" id="btn-mark-all">Mark all read</button>
        </div>
        <div class="notif-list" id="notif-container">
          <div class="notif-item unread">
            <div class="notif-title">Low Stock Alert: WMS-1001</div>
            <div class="notif-msg">Quantity dropped to 10 units (threshold 20).</div>
          </div>
          <div class="notif-item unread">
            <div class="notif-title">Order Confirmed: #ORD-8801</div>
            <div class="notif-msg">VIP Customer Acme Logistics confirmed.</div>
          </div>
          <div class="notif-item">
            <div class="notif-title">Vehicle Maintenance Due</div>
            <div class="notif-msg">Truck TX-V102 threshold exceeded.</div>
          </div>
        </div>
      </div>
    `;

    this._dropdown = root.getElementById('dropdown-menu');
    this._bell = root.getElementById('bell-button');
    this._badge = root.getElementById('unread-badge');

    this._bell.addEventListener('click', () => {
      this._dropdown.hidden = !this._dropdown.hidden;
    });

    root.getElementById('btn-mark-all').addEventListener('click', () => {
      root.querySelectorAll('.notif-item').forEach((el) => el.classList.remove('unread'));
      this._badge.style.display = 'none';
    });
  }
}

customElements.define('wms-notification-center', WmsNotificationCenter);
