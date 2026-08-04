import { attachStyles } from '../design-system/utils/styles.js';
import '../design-system/index.js';

// <wms-kanban-board>
// Features: Order/shipment pipeline columns with native HTML5 Drag and Drop API,
// touch-friendly mobile move buttons (touch target ≥44px), and wms-card-moved custom events.

const CSS = `
  :host {
    display: block;
    font-family: var(--font-sans, sans-serif);
  }

  .kanban-board {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-4, 16px);
    align-items: start;
  }

  .kanban-column {
    background: var(--color-bg-subtle, #fafafa);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-lg, 12px);
    padding: var(--space-3, 12px);
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
    min-height: 400px;
    transition: background var(--duration-fast, 120ms) ease;
  }

  .kanban-column.drag-over {
    background: var(--color-primary-subtle, #eef2ff);
    border-style: dashed;
    border-color: var(--color-primary, #4f46e5);
  }

  .column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-2, 8px);
    border-bottom: 1px solid var(--color-border-subtle, #f4f4f5);
  }

  .column-title {
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-text-primary, #18181b);
  }

  .cards-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 12px);
    flex: 1;
  }

  .kanban-card {
    background: var(--color-bg-surface, #ffffff);
    border: 1px solid var(--color-border-default, #e4e4e7);
    border-radius: var(--radius-md, 8px);
    padding: var(--space-3, 12px);
    box-shadow: var(--shadow-sm, 0 1px 3px 0 rgb(15 15 20 / 0.06));
    cursor: grab;
    user-select: none;
    transition: box-shadow var(--duration-fast, 120ms) ease, transform var(--duration-fast, 120ms) ease;
  }

  .kanban-card:active { cursor: grabbing; }

  .kanban-card.dragging {
    opacity: 0.4;
    transform: scale(0.98);
  }

  .card-id {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-xs, 0.75rem);
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-primary, #4f46e5);
  }

  .card-customer {
    font-size: var(--text-sm, 0.8125rem);
    font-weight: var(--font-weight-medium, 500);
    margin: 4px 0;
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: var(--space-2, 8px);
    font-size: var(--text-xs, 0.75rem);
    color: var(--color-text-secondary, #52525b);
  }

  /* Mobile move button (touch target >= 44px) */
  .mobile-move-btn {
    min-height: 44px;
    min-width: 44px;
    padding: 0 12px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--color-border-default, #e4e4e7);
    background: var(--color-bg-subtle, #fafafa);
    cursor: pointer;
    font-size: var(--text-xs, 0.75rem);
  }

  /* States */
  .state-box {
    text-align: center;
    padding: var(--space-6, 24px);
    color: var(--color-text-tertiary, #a1a1aa);
    font-size: var(--text-xs, 0.75rem);
  }
`;

export class WmsKanbanBoard extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    attachStyles(root, 'wms-kanban-board', CSS);

    root.innerHTML = '<div class="kanban-board" part="board" id="board-root"></div>';
    this._boardRoot = root.getElementById('board-root');

    this._columns = [];
    this._cards = [];
    this._draggedCardId = null;
  }

  set columns(cols) {
    this._columns = cols || [];
    this._render();
  }

  set cards(cards) {
    this._cards = cards || [];
    this._render();
  }

  _render() {
    this._boardRoot.innerHTML = this._columns.map((col) => {
      const colCards = this._cards.filter((c) => c.status === col.id);
      return `
        <div class="kanban-column" data-col-id="${col.id}">
          <div class="column-header">
            <span class="column-title">${col.title}</span>
            <wms-badge size="sm">${colCards.length}</wms-badge>
          </div>
          <div class="cards-container">
            ${colCards.length === 0 ? '<div class="state-box">No orders in pipeline</div>' : ''}
            ${colCards.map((card) => `
              <div class="kanban-card" draggable="true" data-card-id="${card.id}">
                <div class="card-id">${card.id}</div>
                <div class="card-customer">${card.customer || 'Standard Order'}</div>
                <div class="card-footer">
                  <span>${card.itemsCount || 1} items</span>
                  <button class="mobile-move-btn" data-action="next-stage" data-card-id="${card.id}" data-col-id="${col.id}">
                    Move Next ›
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    this._attachEvents();
  }

  _attachEvents() {
    // HTML5 Drag and Drop listeners
    this._boardRoot.querySelectorAll('.kanban-card').forEach((cardEl) => {
      cardEl.addEventListener('dragstart', (e) => {
        this._draggedCardId = cardEl.dataset.cardId;
        cardEl.classList.add('dragging');
        e.dataTransfer.setData('text/plain', this._draggedCardId);
      });

      cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
        this._draggedCardId = null;
      });
    });

    this._boardRoot.querySelectorAll('.kanban-column').forEach((colEl) => {
      colEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        colEl.classList.add('drag-over');
      });

      colEl.addEventListener('dragleave', () => {
        colEl.classList.remove('drag-over');
      });

      colEl.addEventListener('drop', (e) => {
        e.preventDefault();
        colEl.classList.remove('drag-over');
        const targetColId = colEl.dataset.colId;
        if (this._draggedCardId && targetColId) {
          this._moveCard(this._draggedCardId, targetColId);
        }
      });
    });

    // Touch fallback buttons
    this._boardRoot.querySelectorAll('[data-action="next-stage"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.dataset.cardId;
        const currentColId = btn.dataset.colId;
        const colIdx = this._columns.findIndex((c) => c.id === currentColId);
        if (colIdx >= 0 && colIdx < this._columns.length - 1) {
          const targetColId = this._columns[colIdx + 1].id;
          this._moveCard(cardId, targetColId);
        }
      });
    });
  }

  _moveCard(cardId, targetColId) {
    const card = this._cards.find((c) => c.id === cardId);
    if (!card || card.status === targetColId) return;

    const sourceColId = card.status;
    card.status = targetColId;
    this._render();

    this.dispatchEvent(new CustomEvent('wms-card-moved', {
      bubbles: true,
      composed: true,
      detail: { cardId, sourceColumn: sourceColId, targetColumn: targetColId },
    }));
  }
}

customElements.define('wms-kanban-board', WmsKanbanBoard);
