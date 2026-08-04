import { attachStyles } from '../utils/styles.js';

// <wms-toast>
// Attributes: variant (neutral|success|warning|danger|info), duration (ms, 0 = persistent), open
// Slots: default (message)
// Parts: toast, content, close
// Events: wms-close
//
// Auto-shows on connect, auto-dismisses after `duration` ms (default 4000),
// pauses its timer on hover/focus, and removes itself from the DOM once its
// exit transition finishes.

const CSS = `
  :host { display: block; font-family: var(--font-sans, sans-serif); }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3, 12px);
    min-width: 280px;
    max-width: 420px;
    padding: var(--space-3, 12px) var(--space-3, 12px) var(--space-3, 12px) var(--space-4, 16px);
    background: var(--color-bg-inverse, #18181b);
    color: var(--color-text-inverse, #fff);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--shadow-lg);
    border-left: 3px solid var(--_accent, var(--color-text-inverse, #fff));
    opacity: 0;
    transform: translateY(8px) scale(0.98);
    transition: opacity var(--duration-base, 180ms) var(--ease-emphasized, ease),
                transform var(--duration-base, 180ms) var(--ease-emphasized, ease);
  }
  :host([open]) .toast { opacity: 1; transform: none; }

  :host([variant='success']) .toast { --_accent: var(--success-500, #10b981); }
  :host([variant='warning']) .toast { --_accent: var(--warning-500, #f59e0b); }
  :host([variant='danger'])  .toast { --_accent: var(--danger-500, #ef4444); }
  :host([variant='info'])    .toast { --_accent: var(--info-500, #3b82f6); }

  .content { flex: 1; font-size: var(--text-sm, 0.8125rem); line-height: var(--leading-snug, 1.375); padding-top: 2px; }

  .close {
    all: unset;
    cursor: pointer;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-sm, 6px);
    opacity: 0.7;
  }
  .close:hover { opacity: 1; background: rgb(255 255 255 / 0.12); }
  .close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; opacity: 1; }

  @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
`;

const TEMPLATE = `
  <div class="toast" part="toast">
    <div class="content" part="content"><slot></slot></div>
    <button class="close" part="close" type="button" aria-label="Dismiss notification">&times;</button>
  </div>
`;

export class WmsToast extends HTMLElement {
  static get observedAttributes() { return ['variant']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-toast', CSS);
    root.innerHTML = TEMPLATE;
    this._toast = root.querySelector('.toast');
    this._timer = null;

    root.querySelector('.close').addEventListener('click', () => this.dismiss());
    this.addEventListener('mouseenter', () => this._clearTimer());
    this.addEventListener('mouseleave', () => this._startTimer());
    this.addEventListener('focusin', () => this._clearTimer());
    this.addEventListener('focusout', () => this._startTimer());
    this._toast.addEventListener('transitionend', () => {
      if (!this.hasAttribute('open')) this.remove();
    });
  }

  connectedCallback() {
    if (!this.hasAttribute('variant')) this.setAttribute('variant', 'neutral');
    const assertive = ['danger', 'warning'].includes(this.getAttribute('variant'));
    this._toast.setAttribute('role', assertive ? 'alert' : 'status');
    this._toast.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    this._toast.setAttribute('aria-atomic', 'true');
    if (!this.hasAttribute('open')) this.setAttribute('open', '');
    this._startTimer();
  }

  disconnectedCallback() { this._clearTimer(); }

  get duration() {
    const v = Number(this.getAttribute('duration'));
    return Number.isFinite(v) ? v : 4000;
  }
  set duration(v) { this.setAttribute('duration', String(v)); }

  _startTimer() {
    this._clearTimer();
    const ms = this.duration;
    if (ms > 0 && this.hasAttribute('open')) {
      this._timer = setTimeout(() => this.dismiss(), ms);
    }
  }

  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  dismiss() {
    this._clearTimer();
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('wms-close', { bubbles: true, composed: true }));
  }
}

customElements.define('wms-toast', WmsToast);
