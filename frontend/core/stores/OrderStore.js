import { createStore } from '../Store.js';

const initialState = {
  columns: [
    { id: 'PENDING', title: 'Pending Fulfillment' },
    { id: 'PICKING', title: 'In Picking' },
    { id: 'PACKING', title: 'In Packing' },
    { id: 'DISPATCHED', title: 'Dispatched' },
  ],
  orders: [
    { id: 'ORD-8801', customer: 'Acme Logistics', itemsCount: 14, status: 'PENDING', priority: 'HIGH' },
    { id: 'ORD-8802', customer: 'Global Cargo Ltd', itemsCount: 4, status: 'PICKING', priority: 'NORMAL' },
    { id: 'ORD-8803', customer: 'Apex Retail Inc', itemsCount: 28, status: 'PACKING', priority: 'NORMAL' },
    { id: 'ORD-8804', customer: 'Vanguard Express', itemsCount: 2, status: 'DISPATCHED', priority: 'LOW' },
  ],
  loading: false,
  error: null,
};

function orderReducer(state = initialState, action) {
  switch (action.type) {
    case 'ORDERS_FETCH_START':
      return { ...state, loading: true, error: null };
    case 'ORDERS_FETCH_SUCCESS':
      return { ...state, loading: false, orders: action.payload };
    case 'ORDERS_FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ORDERS_MOVE_CARD': {
      const { orderId, targetStatus } = action.payload;
      const updatedOrders = state.orders.map((ord) => {
        if (ord.id === orderId) {
          return { ...ord, status: targetStatus };
        }
        return ord;
      });
      return { ...state, orders: updatedOrders };
    }
    default:
      return state;
  }
}

export const OrderStore = createStore(orderReducer, initialState);
