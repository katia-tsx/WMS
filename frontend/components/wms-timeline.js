import { attachStyles } from '../design-system/utils/styles.js';
import '../design-system/index.js';

// <wms-timeline>
// Features: Vertical shipment tracking timeline with ARIA live region (aria-live="polite")
// for accessible real-time status announcements.

const CSS = `
  :host {
    display: block;
    font-family: var(--font-sans, sans-serif);
  }

  .timeline {
    display: flex;
    flex-direction: column;
    position: relative;
    padding-left: var(--space-6, 24px);
  }

  .timeline::before {
    content: '';
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: 9px;
    width: 2px;
    background: var(--color-border-default, #e4e4e7);
  }

  .timeline-item {
    position: relative;
    padding-bottom: var(--space-6, 24px);
  }
  .timeline-item:last-child { padding-bottom: 0; }

  .timeline-dot {
    position: absolute;
    left: -24px;
    top: 2px;
    width: 20px;
    height: 20px;
    border-radius: var(--radius-full, 9999px);
    background: var(--color-bg-surface, #ffffff);
    border: 2px solid var(--color-border-strong, #a1a1aa);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    line-height: 1;
    z-index: 2;
  }

  .timeline-item[data-status='COMPLETED'] .timeline-dot {
    background: var(--color-success, #059669);
    border-color: var(--color-success, #059669);
    color: #ffffff;
  }

  .timeline-item[data-status='IN_PROGRESS'] .timeline-dot {
    background: var(--color-primary, #4f46e5);
    border-color: var(--color-primary, #4f46e5);
    color: #ffffff;
    box-shadow: 0 0 0 4px var(--color-primary-subtle, #eef2ff);
  }

  .timeline-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .timeline-title {
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-text-primary, #18181b);
  }

  .timeline-location {
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-text-secondary, #52525b);
  }

  .timeline-time {
    font-size: var(--text-2xs, 0.6875rem);
    color: var(--color-text-tertiary, #a1a1aa);
    margin-top: 2px;
  }
`;

export class WmsTimeline extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-timeline', CSS);

    root.innerHTML = `
      <div class="timeline" part="timeline" id="timeline-root" role="region" aria-live="polite" aria-label="Shipment Tracking History">
      </div>
    `;

    this._root = root.getElementById('timeline-root');
    this._events = [];
  }

  set events(evts) {
    this._events = evts || [];
    this._render();
  }

  get events() { return this._events; }

  _render() {
    this._root.innerHTML = this._events.map((evt) => {
      let icon = '•';
      if (evt.status === 'COMPLETED') icon = '✓';
      else if (evt.status === 'IN_PROGRESS') icon = '➔';

      return `
        <div class="timeline-item" data-status="${evt.status || 'PENDING'}">
          <div class="timeline-dot">${icon}</div>
          <div class="timeline-content">
            <span class="timeline-title">${evt.title}</span>
            <span class="timeline-location">${evt.location || ''}</span>
            <span class="timeline-time">${evt.timestamp || ''}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

customElements.define('wms-timeline', WmsTimeline);
