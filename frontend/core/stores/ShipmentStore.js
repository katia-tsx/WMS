import { createStore } from '../Store.js';

const initialState = {
  activeShipment: {
    id: 'SHP-9021',
    carrier: 'FedEx Freight',
    trackingNumber: '781290481239',
    destination: 'Chicago DC-West Hub',
    status: 'IN_TRANSIT',
    events: [
      { id: 'evt-1', title: 'Shipment Created', location: 'DC-East Main Warehouse', timestamp: '2026-08-04 06:30 AM', status: 'COMPLETED' },
      { id: 'evt-2', title: 'Departed Facility', location: 'DC-East Sorting Hub', timestamp: '2026-08-04 07:45 AM', status: 'COMPLETED' },
      { id: 'evt-3', title: 'In Transit', location: 'Interstate 80 Mile 142', timestamp: '2026-08-04 08:20 AM', status: 'IN_PROGRESS' },
      { id: 'evt-4', title: 'Arrived at Destination Hub', location: 'Chicago DC-West Hub', timestamp: 'Pending', status: 'PENDING' },
    ],
  },
  loading: false,
  error: null,
};

function shipmentReducer(state = initialState, action) {
  switch (action.type) {
    case 'SHIPMENT_FETCH_START':
      return { ...state, loading: true, error: null };
    case 'SHIPMENT_FETCH_SUCCESS':
      return { ...state, loading: false, activeShipment: action.payload };
    case 'SHIPMENT_FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'SHIPMENT_ADD_EVENT': {
      const newEvents = [...state.activeShipment.events, action.payload];
      return {
        ...state,
        activeShipment: { ...state.activeShipment, events: newEvents },
      };
    }
    default:
      return state;
  }
}

export const ShipmentStore = createStore(shipmentReducer, initialState);
