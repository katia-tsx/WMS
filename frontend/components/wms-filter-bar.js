import { attachStyles } from '../design-system/utils/styles.js';
import '../design-system/index.js';

// Specification Pattern Frontend Mirror
export class Specification {
  isSatisfiedBy(item) { return true; }
  and(otherSpec) { return new AndSpecification(this, otherSpec); }
  or(otherSpec) { return new OrSpecification(this, otherSpec); }
}

export class PropertyEqualsSpecification extends Specification {
  constructor(property, targetValue) {
    super();
    this.property = property;
    this.targetValue = targetValue;
  }
  isSatisfiedBy(item) {
    if (!item) return false;
    return item[this.property] === this.targetValue;
  }
}

export class AndSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
  isSatisfiedBy(item) {
    return this.left.isSatisfiedBy(item) && this.right.isSatisfiedBy(item);
  }
}

export class OrSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }
  isSatisfiedBy(item) {
    return this.left.isSatisfiedBy(item) || this.right.isSatisfiedBy(item);
  }
}

const CSS = `
  :host {
    display: block;
    font-family: var(--font-sans, sans-serif);
    margin-bottom: var(--space-4, 16px);
  }

  .filter-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3, 12px);
    background: var(--color-bg-surface, #ffffff);
    padding: var(--space-3, 12px) var(--space-4, 16px);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2, 8px);
  }

  .filter-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1, 4px);
    background: var(--color-primary-subtle, #eef2ff);
    color: var(--color-primary, #4f46e5);
    border: 1px solid var(--brand-200, #c7d2fe);
    border-radius: var(--radius-full, 9999px);
    padding: 4px 12px;
    font-size: var(--text-xs, 0.75rem);
    font-weight: var(--font-weight-medium, 500);
  }

  .chip-remove-btn {
    all: unset;
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.1rem;
    line-height: 1;
    margin-left: 2px;
  }
  .chip-remove-btn:hover { color: var(--color-danger, #dc2626); }

  .clear-all-btn {
    min-height: 44px;
    background: transparent;
    border: none;
    color: var(--color-text-tertiary, #a1a1aa);
    font-size: var(--text-xs, 0.75rem);
    cursor: pointer;
    padding: 0 var(--space-2, 8px);
  }
  .clear-all-btn:hover { color: var(--color-text-primary, #18181b); }
`;

export class WmsFilterBar extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-filter-bar', CSS);

    root.innerHTML = `
      <div class="filter-bar" part="bar">
        <slot></slot>
        <div class="chip-list" id="chip-list"></div>
        <button class="clear-all-btn" id="clear-all" hidden>Clear All</button>
      </div>
    `;

    this._chipList = root.getElementById('chip-list');
    this._clearBtn = root.getElementById('clear-all');
    this._filters = {};

    this._clearBtn.addEventListener('click', () => this.clearFilters());
  }

  setFilter(key, value, label) {
    if (!value || value === 'ALL') {
      delete this._filters[key];
    } else {
      this._filters[key] = { value, label: label || `${key}: ${value}` };
    }
    this._renderChips();
    this._emitChanged();
  }

  clearFilters() {
    this._filters = {};
    this._renderChips();
    this._emitChanged();
  }

  getSpecification() {
    const specs = [];
    for (const [key, filter] of Object.entries(this._filters)) {
      specs.push(new PropertyEqualsSpecification(key, filter.value));
    }
    if (specs.length === 0) return new Specification();
    return specs.reduce((acc, curr) => acc.and(curr));
  }

  _renderChips() {
    const entries = Object.entries(this._filters);
    this._clearBtn.hidden = entries.length === 0;

    this._chipList.innerHTML = entries.map(([key, filter]) => `
      <span class="filter-chip" data-key="${key}">
        ${filter.label}
        <button class="chip-remove-btn" aria-label="Remove filter ${filter.label}">&times;</button>
      </span>
    `).join('');

    this._chipList.querySelectorAll('.chip-remove-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        const key = chip.dataset.key;
        delete this._filters[key];
        this._renderChips();
        this._emitChanged();
      });
    });
  }

  _emitChanged() {
    this.dispatchEvent(new CustomEvent('wms-filter-changed', {
      bubbles: true,
      composed: true,
      detail: {
        filters: { ...this._filters },
        specification: this.getSpecification(),
      },
    }));
  }
}

customElements.define('wms-filter-bar', WmsFilterBar);
