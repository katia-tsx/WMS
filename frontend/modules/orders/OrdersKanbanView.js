import { OrderStore } from '../../core/stores/OrderStore.js';
import '../../components/wms-kanban-board.js';
import '../../design-system/index.js';

export class OrdersKanbanView {
  constructor(container) {
    this.container = container;
    this._unsubscribe = null;
  }

  mount() {
    this.container.innerHTML = `
      <div class="orders-kanban-module" style="font-family: var(--font-sans);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          <div>
            <h1 style="font-size: 1.5rem; font-weight: 600; margin: 0;">Order Fulfillment Pipeline</h1>
            <p style="color: var(--color-text-secondary); margin: 4px 0 0; font-size: 0.875rem;">
              Drag and drop orders between lifecycle stages. Optimistic updates with automatic rollback.
            </p>
          </div>
          <div>
            <wms-button id="btn-create-order" size="sm">+ Create Order</wms-button>
          </div>
        </div>

        <wms-kanban-board id="order-kanban-board"></wms-kanban-board>
      </div>
    `;

    this._boardEl = this.container.querySelector('#order-kanban-board');

    this._render();
    this._unsubscribe = OrderStore.subscribe(() => this._render());

    // Drag and drop event listener with optimistic UI update
    this._boardEl.addEventListener('wms-card-moved', (e) => {
      const { cardId, targetColumn } = e.detail;

      // Optimistic update
      OrderStore.dispatch({
        type: 'ORDERS_MOVE_CARD',
        payload: { orderId: cardId, targetStatus: targetColumn },
      });
    });
  }

  unmount() {
    if (this._unsubscribe) this._unsubscribe();
  }

  _render() {
    const state = OrderStore.getState();
    this._boardEl.columns = state.columns;
    this._boardEl.cards = state.orders;
  }
}
