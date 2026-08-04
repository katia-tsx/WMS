import { attachStyles } from '../utils/styles.js';

// <wms-badge>
// Attributes: variant (neutral|primary|success|warning|danger|info), size (sm|md), dot
// Slots: default (label)
// Parts: badge, dot

const CSS = `
  :host { display: inline-flex; }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1, 4px);
    font-family: var(--font-sans, sans-serif);
    font-weight: var(--font-weight-medium, 500);
    font-size: var(--text-xs, 0.75rem);
    line-height: var(--leading-none, 1);
    padding: var(--space-1, 4px) var(--space-2, 8px);
    border-radius: var(--radius-full, 9999px);
    background: var(--color-bg-muted, #f4f4f5);
    color: var(--color-text-secondary, #52525b);
    white-space: nowrap;
  }

  :host([variant='primary']) .badge { background: var(--color-primary-subtle, #eef2ff); color: var(--color-primary, #4f46e5); }
  :host([variant='success']) .badge { background: var(--color-success-subtle, #ecfdf5); color: var(--color-success, #059669); }
  :host([variant='warning']) .badge { background: var(--color-warning-subtle, #fffbeb); color: var(--color-warning, #d97706); }
  :host([variant='danger'])  .badge { background: var(--color-danger-subtle, #fef2f2); color: var(--color-danger, #dc2626); }
  :host([variant='info'])    .badge { background: var(--color-info-subtle, #eff6ff); color: var(--color-info, #2563eb); }

  :host([size='sm']) .badge { padding: 2px var(--space-2, 8px); font-size: var(--text-2xs, 0.6875rem); }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }
`;

const TEMPLATE = `
  <span class="badge" part="badge">
    <span class="dot" part="dot" hidden></span>
    <slot></slot>
  </span>
`;

export class WmsBadge extends HTMLElement {
  static get observedAttributes() { return ['dot', 'variant', 'size']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-badge', CSS);
    root.innerHTML = TEMPLATE;
    this._dot = root.querySelector('.dot');
  }

  connectedCallback() {
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'neutral');
    this._dot.hidden = !this.hasAttribute('dot');
  }

  attributeChangedCallback() {
    if (this._dot) this._dot.hidden = !this.hasAttribute('dot');
  }
}

customElements.define('wms-badge', WmsBadge);
