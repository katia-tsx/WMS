import { attachStyles } from '../utils/styles.js';

// <wms-button>
// Attributes: variant (primary|secondary|outline|ghost|danger), size (sm|md|lg),
//             disabled, loading, type (button|submit|reset), full-width, aria-label
// Slots: default (label), start (leading icon), end (trailing icon)
// Parts: button, spinner
// Events: native `click` (suppressed while disabled/loading, as with a real <button>)

const CSS = `
  :host {
    display: inline-block;
    --_bg: var(--color-primary, #4f46e5);
    --_bg-hover: var(--color-primary-hover, #4338ca);
    --_bg-active: var(--color-primary-active, #3730a3);
    --_fg: var(--color-on-primary, #fff);
    --_border: transparent;
  }
  :host([full-width]) { display: block; }

  :host([variant='secondary']) {
    --_bg: var(--color-bg-muted, #f4f4f5);
    --_bg-hover: var(--color-border-default, #e4e4e7);
    --_bg-active: var(--color-border-strong, #d4d4d8);
    --_fg: var(--color-text-primary, #18181b);
  }
  :host([variant='outline']) {
    --_bg: transparent;
    --_bg-hover: var(--color-bg-subtle, #fafafa);
    --_bg-active: var(--color-bg-muted, #f4f4f5);
    --_fg: var(--color-text-primary, #18181b);
    --_border: var(--color-border-default, #e4e4e7);
  }
  :host([variant='ghost']) {
    --_bg: transparent;
    --_bg-hover: var(--color-bg-subtle, #fafafa);
    --_bg-active: var(--color-bg-muted, #f4f4f5);
    --_fg: var(--color-text-secondary, #52525b);
  }
  :host([variant='danger']) {
    --_bg: var(--color-danger, #dc2626);
    --_bg-hover: var(--color-danger-hover, #b91c1c);
    --_bg-active: var(--color-danger-hover, #b91c1c);
    --_fg: var(--color-on-danger, #fff);
  }

  button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2, 8px);
    width: 100%;
    font-family: var(--font-sans, sans-serif);
    font-weight: var(--font-weight-medium, 500);
    white-space: nowrap;
    cursor: pointer;
    background: var(--_bg);
    color: var(--_fg);
    border: 1px solid var(--_border);
    border-radius: var(--radius-md, 8px);
    transition: background var(--duration-fast, 120ms) var(--ease-standard, ease),
                border-color var(--duration-fast, 120ms) var(--ease-standard, ease),
                opacity var(--duration-fast, 120ms) var(--ease-standard, ease);
  }
  button:hover:not(:disabled) { background: var(--_bg-hover); }
  button:active:not(:disabled) { background: var(--_bg-active); }
  button:focus-visible {
    outline: 2px solid var(--color-focus-ring, #6366f1);
    outline-offset: 2px;
  }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  :host([size='sm']) button { height: 28px; padding: 0 var(--space-3, 12px); font-size: var(--text-sm, 0.8125rem); }
  :host([size='md']) button,
  :host(:not([size])) button { height: 36px; padding: 0 var(--space-4, 16px); font-size: var(--text-base, 0.875rem); }
  :host([size='lg']) button { height: 44px; padding: 0 var(--space-5, 20px); font-size: var(--text-md, 0.9375rem); }

  .spinner {
    width: 1em;
    height: 1em;
    border-radius: 50%;
    border: 2px solid currentColor;
    border-right-color: transparent;
    animation: wms-button-spin 0.6s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 1.2s; } }
  @keyframes wms-button-spin { to { transform: rotate(360deg); } }

  [hidden] { display: none !important; }
`;

const TEMPLATE = `
  <button part="button" type="button">
    <span class="spinner" part="spinner" hidden></span>
    <slot name="start"></slot>
    <slot></slot>
    <slot name="end"></slot>
  </button>
`;

export class WmsButton extends HTMLElement {
  static get observedAttributes() {
    return ['disabled', 'loading', 'type', 'variant', 'size', 'aria-label'];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-button', CSS);
    root.innerHTML = TEMPLATE;
    this._button = root.querySelector('button');
    this._spinner = root.querySelector('.spinner');
  }

  connectedCallback() {
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'primary');
    this._sync();
  }

  attributeChangedCallback() {
    this._sync();
  }

  _sync() {
    if (!this._button) return;
    this._button.type = this.getAttribute('type') || 'button';
    this._button.disabled = this.hasAttribute('disabled') || this.hasAttribute('loading');
    this._button.setAttribute('aria-busy', String(this.hasAttribute('loading')));
    this._spinner.hidden = !this.hasAttribute('loading');
    if (this.hasAttribute('aria-label')) {
      this._button.setAttribute('aria-label', this.getAttribute('aria-label'));
    } else {
      this._button.removeAttribute('aria-label');
    }
  }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(value) { this.toggleAttribute('disabled', Boolean(value)); }

  get loading() { return this.hasAttribute('loading'); }
  set loading(value) { this.toggleAttribute('loading', Boolean(value)); }

  focus(options) { this._button.focus(options); }
}

customElements.define('wms-button', WmsButton);
