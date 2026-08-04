import { attachStyles } from '../utils/styles.js';

// <wms-input>
// Attributes: label, type, placeholder, value, hint, error, disabled, readonly,
//             required, size (sm|md|lg), name, aria-label
// Slots: start, end (icons / adornments)
// Parts: field, label, control, input, hint, error
// Events: native `input` / `change` (both composed by spec, so they cross the
//         shadow boundary and retarget to the host — read event.target.value)

const CSS = `
  :host { display: block; font-family: var(--font-sans, sans-serif); }
  :host([disabled]) { pointer-events: none; }

  .field { display: flex; flex-direction: column; gap: var(--space-1, 4px); }

  label {
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-weight-medium, 500);
    color: var(--color-text-primary, #18181b);
  }
  label[hidden] { display: none; }

  .control {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    background: var(--color-bg-surface, #fff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-md, 8px);
    padding: 0 var(--space-3, 12px);
    transition: border-color var(--duration-fast, 120ms) var(--ease-standard, ease),
                box-shadow var(--duration-fast, 120ms) var(--ease-standard, ease);
  }
  .control:focus-within {
    border-color: var(--color-focus-ring, #6366f1);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-focus-ring, #6366f1) 24%, transparent);
  }
  :host([error]) .control { border-color: var(--color-danger, #dc2626); }
  :host([error]) .control:focus-within {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger, #dc2626) 20%, transparent);
  }
  :host([disabled]) .control { background: var(--color-bg-muted, #f4f4f5); opacity: 0.6; }

  input {
    all: unset;
    flex: 1;
    min-width: 0;
    font-family: inherit;
    font-size: var(--text-base, 0.875rem);
    color: var(--color-text-primary, #18181b);
    height: 36px;
  }
  input::placeholder { color: var(--color-text-tertiary, #a1a1aa); }
  input:disabled { cursor: not-allowed; }

  :host([size='sm']) .control { padding: 0 var(--space-2, 8px); }
  :host([size='sm']) input { height: 28px; font-size: var(--text-sm, 0.8125rem); }
  :host([size='lg']) input { height: 44px; font-size: var(--text-md, 0.9375rem); }

  #hint, #error { margin: 0; font-size: var(--text-xs, 0.75rem); }
  #hint { color: var(--color-text-secondary, #52525b); }
  #error { color: var(--color-danger, #dc2626); }
  [hidden] { display: none !important; }

  ::slotted([slot='start']), ::slotted([slot='end']) {
    display: inline-flex;
    color: var(--color-text-tertiary, #a1a1aa);
  }
`;

const TEMPLATE = `
  <div class="field" part="field">
    <label id="label" part="label" for="control" hidden></label>
    <div class="control" part="control">
      <slot name="start"></slot>
      <input id="control" part="input" />
      <slot name="end"></slot>
    </div>
    <p id="hint" part="hint" hidden></p>
    <p id="error" part="error" role="alert" hidden></p>
  </div>
`;

export class WmsInput extends HTMLElement {
  static get observedAttributes() {
    return [
      'label', 'type', 'placeholder', 'value', 'hint', 'error',
      'disabled', 'readonly', 'required', 'size', 'name', 'aria-label',
    ];
  }

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-input', CSS);
    root.innerHTML = TEMPLATE;
    this._input = root.getElementById('control');
    this._labelEl = root.getElementById('label');
    this._hintEl = root.getElementById('hint');
    this._errorEl = root.getElementById('error');
  }

  connectedCallback() {
    this._sync();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'value' && this._input.value !== (newValue ?? '')) {
      this._input.value = newValue ?? '';
    }
    this._sync();
  }

  get value() { return this._input.value; }
  set value(v) { this._input.value = v ?? ''; }

  get disabled() { return this.hasAttribute('disabled'); }
  set disabled(v) { this.toggleAttribute('disabled', Boolean(v)); }

  focus(options) { this._input.focus(options); }

  _sync() {
    this._input.type = this.getAttribute('type') || 'text';
    this._input.placeholder = this.getAttribute('placeholder') || '';
    this._input.disabled = this.hasAttribute('disabled');
    this._input.readOnly = this.hasAttribute('readonly');
    this._input.required = this.hasAttribute('required');
    if (this.hasAttribute('name')) this._input.setAttribute('name', this.getAttribute('name'));

    const label = this.getAttribute('label');
    this._labelEl.textContent = label || '';
    this._labelEl.hidden = !label;

    const hint = this.getAttribute('hint');
    const error = this.getAttribute('error');
    this._hintEl.textContent = hint || '';
    this._hintEl.hidden = !hint || Boolean(error);
    this._errorEl.textContent = error || '';
    this._errorEl.hidden = !error;

    const describedBy = [];
    if (hint && !error) describedBy.push('hint');
    if (error) describedBy.push('error');
    if (describedBy.length) this._input.setAttribute('aria-describedby', describedBy.join(' '));
    else this._input.removeAttribute('aria-describedby');

    this._input.setAttribute('aria-invalid', String(Boolean(error)));

    if (this.hasAttribute('aria-label')) {
      this._input.setAttribute('aria-label', this.getAttribute('aria-label'));
    } else {
      this._input.removeAttribute('aria-label');
    }
  }
}

customElements.define('wms-input', WmsInput);
