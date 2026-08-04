import { attachStyles } from '../utils/styles.js';

// <wms-skeleton>
// Attributes: variant (text|circle|rect), width, height, lines (text variant only)
// Parts: shape / line
// Always aria-hidden — purely decorative; the container showing loading state
// should carry aria-busy="true" itself.

const CSS = `
  :host { display: block; }

  .shape, .line {
    background: linear-gradient(
      90deg,
      var(--color-bg-muted, #f4f4f5) 25%,
      var(--color-border-default, #e4e4e7) 37%,
      var(--color-bg-muted, #f4f4f5) 63%
    );
    background-size: 400% 100%;
    animation: wms-skeleton-shimmer 1.4s ease-in-out infinite;
    border-radius: var(--radius-sm, 6px);
  }
  @keyframes wms-skeleton-shimmer {
    0% { background-position: 100% 50%; }
    100% { background-position: 0 50%; }
  }
  @media (prefers-reduced-motion: reduce) { .shape, .line { animation: none; } }

  :host([variant='circle']) .shape { border-radius: var(--radius-full, 9999px); }

  .shape { width: var(--w, 100%); height: var(--h, 1em); }

  .text-lines { display: flex; flex-direction: column; gap: var(--space-2, 8px); }
  .line { height: var(--h, 0.9em); width: 100%; }
  .line:last-child:not(:only-child) { width: 60%; }
`;

export class WmsSkeleton extends HTMLElement {
  static get observedAttributes() { return ['variant', 'width', 'height', 'lines']; }

  constructor() {
    super();
    this.setAttribute('aria-hidden', 'true');
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-skeleton', CSS);
    root.innerHTML = '<div class="root"></div>';
    this._root = root.querySelector('.root');
  }

  connectedCallback() { this._render(); }
  attributeChangedCallback() { this._render(); }

  _render() {
    const variant = this.getAttribute('variant') || 'text';
    if (this.hasAttribute('width')) this.style.setProperty('--w', this.getAttribute('width'));
    if (this.hasAttribute('height')) this.style.setProperty('--h', this.getAttribute('height'));

    if (variant === 'text') {
      const lines = Math.max(1, Number(this.getAttribute('lines')) || 1);
      this._root.className = 'text-lines';
      this._root.innerHTML = Array.from({ length: lines }, () => '<div class="line" part="line"></div>').join('');
    } else {
      this._root.className = '';
      this._root.innerHTML = '<div class="shape" part="shape"></div>';
    }
  }
}

customElements.define('wms-skeleton', WmsSkeleton);
