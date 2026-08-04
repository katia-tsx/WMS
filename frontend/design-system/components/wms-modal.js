import { attachStyles } from '../utils/styles.js';

// <wms-modal>
// Attributes: open, label (fallback accessible name), size (sm|md|lg), dismissible ("false" to lock)
// Slots: title, default (body), footer (actions)
// Parts: dialog, header, title, close, body, footer
// Events: wms-open, wms-close
//
// Built on native <dialog>: showModal()/close() give us a real focus trap,
// Escape-to-close, and top-layer stacking for free instead of reimplementing
// them in JS.

const CSS = `
  dialog {
    margin: auto;
    padding: 0;
    border: none;
    border-radius: var(--radius-xl, 16px);
    box-shadow: var(--elevation-modal, var(--shadow-xl));
    background: var(--color-bg-surface, #fff);
    color: var(--color-text-primary, #18181b);
    width: min(92vw, var(--_width, 480px));
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  dialog::backdrop { background: rgb(15 15 20 / 0.5); backdrop-filter: blur(2px); }
  dialog[open] { animation: wms-modal-in var(--duration-base, 180ms) var(--ease-emphasized, ease) both; }
  @keyframes wms-modal-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) { dialog[open] { animation: none; } }

  :host([size='sm']) dialog { --_width: 360px; }
  :host([size='lg']) dialog { --_width: 640px; }

  @media (max-width: 767px) {
    dialog {
      margin: auto 0 0 0;
      width: 100vw;
      border-radius: var(--radius-xl, 16px) var(--radius-xl, 16px) 0 0;
      max-height: 90vh;
    }
    @keyframes wms-modal-in {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: translateY(0); }
    }
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4, 16px);
    padding: var(--space-5, 20px) var(--space-5, 20px) 0;
  }
  #title { margin: 0; font-size: var(--text-xl, 1.125rem); font-weight: var(--font-weight-semibold, 600); }
  #title[hidden] { display: none; }

  .close {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: var(--radius-sm, 6px);
    color: var(--color-text-tertiary, #a1a1aa);
    font-size: 1.25rem;
    line-height: 1;
  }
  .close:hover { background: var(--color-bg-muted, #f4f4f5); color: var(--color-text-primary, #18181b); }
  .close:focus-visible { outline: 2px solid var(--color-focus-ring, #6366f1); outline-offset: 2px; }

  .body { padding: var(--space-5, 20px); overflow-y: auto; font-size: var(--text-base, 0.875rem); line-height: var(--leading-normal, 1.5); }

  .footer { padding: 0 var(--space-5, 20px) var(--space-5, 20px); display: flex; justify-content: flex-end; gap: var(--space-2, 8px); }
  .footer[hidden] { display: none; }
`;

const TEMPLATE = `
  <dialog part="dialog">
    <div class="header" part="header">
      <h2 id="title" part="title" hidden><slot name="title"></slot></h2>
      <button class="close" part="close" type="button" aria-label="Close dialog">&times;</button>
    </div>
    <div class="body" part="body"><slot></slot></div>
    <div class="footer" part="footer"><slot name="footer"></slot></div>
  </dialog>
`;

export class WmsModal extends HTMLElement {
  static get observedAttributes() { return ['open', 'label']; }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-modal', CSS);
    root.innerHTML = TEMPLATE;
    this._dialog = root.querySelector('dialog');
    this._titleEl = root.querySelector('#title');
    this._footer = root.querySelector('.footer');

    root.querySelector('.close').addEventListener('click', () => this.close());

    this._dialog.addEventListener('cancel', (e) => {
      if (!this.dismissible) e.preventDefault();
    });
    this._dialog.addEventListener('close', () => {
      if (this.hasAttribute('open')) this.removeAttribute('open');
      this.dispatchEvent(new CustomEvent('wms-close', { bubbles: true, composed: true }));
    });
    this._dialog.addEventListener('click', (e) => {
      if (e.target === this._dialog && this.dismissible) this.close();
    });

    const titleSlot = root.querySelector('slot[name="title"]');
    titleSlot.addEventListener('slotchange', () => {
      const hasTitle = titleSlot.assignedNodes({ flatten: true }).some((n) => n.textContent.trim());
      this._titleEl.hidden = !hasTitle;
      if (hasTitle) {
        this._dialog.setAttribute('aria-labelledby', 'title');
        this._dialog.removeAttribute('aria-label');
      } else if (this.hasAttribute('label')) {
        this._dialog.removeAttribute('aria-labelledby');
        this._dialog.setAttribute('aria-label', this.getAttribute('label'));
      }
    });
    root.querySelector('slot[name="footer"]').addEventListener('slotchange', (e) => {
      this._footer.hidden = e.target.assignedNodes().length === 0;
    });
  }

  get dismissible() { return this.getAttribute('dismissible') !== 'false'; }

  connectedCallback() {
    if (this.hasAttribute('open')) this._show();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      if (newValue !== null) this._show();
      else this._hide();
    } else if (name === 'label' && !this._dialog.hasAttribute('aria-labelledby')) {
      if (newValue) this._dialog.setAttribute('aria-label', newValue);
      else this._dialog.removeAttribute('aria-label');
    }
  }

  _show() {
    if (!this._dialog.open) {
      this._dialog.showModal();
      this.dispatchEvent(new CustomEvent('wms-open', { bubbles: true, composed: true }));
    }
  }

  _hide() {
    if (this._dialog.open) this._dialog.close();
  }

  show() { this.setAttribute('open', ''); }
  close() { this.removeAttribute('open'); }
}

customElements.define('wms-modal', WmsModal);
