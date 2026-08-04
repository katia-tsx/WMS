import { attachStyles } from '../utils/styles.js';

// <wms-card>
// Attributes: padding (none|sm|md|lg), elevation (0|1|2|3), interactive
// Slots: header, default (body), footer
// Parts: header, body, footer
// Events: native `click`; when [interactive], Enter/Space also trigger a click,
//         matching native <button>-like keyboard behavior.

const CSS = `
  :host {
    display: block;
    background: var(--color-bg-surface, #fff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--elevation-card, var(--shadow-sm));
    transition: box-shadow var(--duration-base, 180ms) var(--ease-standard, ease),
                border-color var(--duration-base, 180ms) var(--ease-standard, ease);
  }
  :host([interactive]) { cursor: pointer; }
  :host([interactive]:hover) { box-shadow: var(--shadow-md); border-color: var(--color-border-strong, #d4d4d8); }
  :host([interactive]:focus-visible) { outline: 2px solid var(--color-focus-ring, #6366f1); outline-offset: 2px; }

  :host([elevation='0']) { box-shadow: none; }
  :host([elevation='2']) { box-shadow: var(--shadow-md); }
  :host([elevation='3']) { box-shadow: var(--shadow-lg); }

  .header { padding: var(--space-4, 16px) var(--space-5, 20px) 0; font-weight: var(--font-weight-semibold, 600); }
  .header[hidden] { display: none; }
  .body { padding: var(--space-5, 20px); font-size: var(--text-base, 0.875rem); color: var(--color-text-primary, #18181b); }
  .footer { padding: 0 var(--space-5, 20px) var(--space-4, 16px); display: flex; align-items: center; gap: var(--space-2, 8px); }
  .footer[hidden] { display: none; }

  :host([padding='none']) .body { padding: 0; }
  :host([padding='sm']) .body { padding: var(--space-3, 12px); }
  :host([padding='lg']) .body { padding: var(--space-6, 24px); }
`;

const TEMPLATE = `
  <div class="header" part="header"><slot name="header"></slot></div>
  <div class="body" part="body"><slot></slot></div>
  <div class="footer" part="footer"><slot name="footer"></slot></div>
`;

export class WmsCard extends HTMLElement {
  static get observedAttributes() { return ['interactive']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-card', CSS);
    root.innerHTML = TEMPLATE;
    this._header = root.querySelector('.header');
    this._footer = root.querySelector('.footer');

    root.querySelector('slot[name="header"]').addEventListener('slotchange', (e) => {
      this._header.hidden = e.target.assignedNodes().length === 0;
    });
    root.querySelector('slot[name="footer"]').addEventListener('slotchange', (e) => {
      this._footer.hidden = e.target.assignedNodes().length === 0;
    });

    this.addEventListener('keydown', (e) => {
      if (!this.hasAttribute('interactive')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.click();
      }
    });
  }

  connectedCallback() {
    const headerSlot = this.shadowRoot.querySelector('slot[name="header"]');
    const footerSlot = this.shadowRoot.querySelector('slot[name="footer"]');
    this._header.hidden = headerSlot.assignedNodes().length === 0;
    this._footer.hidden = footerSlot.assignedNodes().length === 0;
    this._syncInteractive();
  }

  attributeChangedCallback() { this._syncInteractive(); }

  _syncInteractive() {
    if (this.hasAttribute('interactive')) {
      if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
      this.setAttribute('role', 'button');
    } else {
      this.removeAttribute('role');
      this.removeAttribute('tabindex');
    }
  }
}

customElements.define('wms-card', WmsCard);
