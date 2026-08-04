import { createStore } from '../Store.js';

const initialState = {
  items: [
    { sku: 'WMS-1001', name: 'Standard Pallet Box', category: 'Packaging', quantity: 240, bin: 'A1-02-C', status: 'IN_STOCK' },
    { sku: 'WMS-1002', name: 'Heavy-Duty Strapping Roll', category: 'Supplies', quantity: 18, bin: 'B2-11-A', status: 'LOW_STOCK' },
    { sku: 'WMS-1003', name: 'Thermal Shipping Label 4x6', category: 'Labels', quantity: 1200, bin: 'A2-01-A', status: 'IN_STOCK' },
    { sku: 'WMS-1004', name: 'Industrial Stretch Wrap 18in', category: 'Packaging', quantity: 0, bin: 'C1-05-D', status: 'OUT_OF_STOCK' },
  ],
  loading: false,
  error: null,
  filters: { search: '', category: 'ALL', status: 'ALL' },
  pagination: { page: 1, pageSize: 10, totalItems: 4 },
  selectedSku: null,
};

function inventoryReducer(state = initialState, action) {
  switch (action.type) {
    case 'INVENTORY_FETCH_START':
      return { ...state, loading: true, error: null };
    case 'INVENTORY_FETCH_SUCCESS':
      return {
        ...state,
        loading: false,
        items: action.payload.items || state.items,
        pagination: { ...state.pagination, ...action.payload.pagination },
      };
    case 'INVENTORY_FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'INVENTORY_SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload }, pagination: { ...state.pagination, page: 1 } };
    case 'INVENTORY_ADJUST_STOCK': {
      const { sku, delta } = action.payload;
      const updatedItems = state.items.map((item) => {
        if (item.sku === sku) {
          const newQty = Math.max(0, item.quantity + delta);
          let newStatus = 'IN_STOCK';
          if (newQty === 0) newStatus = 'OUT_OF_STOCK';
          else if (newQty < 20) newStatus = 'LOW_STOCK';
          return { ...item, quantity: newQty, status: newStatus };
        }
        return item;
      });
      return { ...state, items: updatedItems };
    }
    case 'INVENTORY_SELECT_SKU':
      return { ...state, selectedSku: action.payload };
    default:
      return state;
  }
}

export const InventoryStore = createStore(inventoryReducer, initialState);
