/**
 * Lightweight, framework-free reactive state management pattern.
 * Provides a Pub/Sub Store with Redux-like reducers, dispatch, subscribe,
 * and selector-based subscriptions (`select`) with shallow-equality memoization
 * to prevent unnecessary component re-renders.
 */

export function shallowEqual(objA, objB) {
  if (Object.is(objA, objB)) return true;
  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key) || !Object.is(objA[key], objB[key])) {
      return false;
    }
  }

  return true;
}

export class Store {
  /**
   * @param {Function} reducer - (state, action) => newState
   * @param {Object} [initialState={}]
   */
  constructor(reducer, initialState = {}) {
    this._reducer = reducer;
    this._state = initialState;
    this._listeners = new Set();
    this._selectorSubscriptions = new Set();
  }

  /**
   * Returns current state snapshot (immutable reference)
   */
  getState() {
    return this._state;
  }

  /**
   * Dispatches an action object to trigger reducer state transition
   * @param {{ type: string, payload?: any }} action
   */
  dispatch(action) {
    if (!action || typeof action.type !== 'string') {
      throw new Error('Action must be an object with a string "type" property');
    }

    const nextState = this._reducer(this._state, action);
    if (!Object.is(this._state, nextState)) {
      this._state = nextState;
      this._notify();
    }
  }

  /**
   * Subscribes to any state change
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * Subscribes to a specific state slice via selector function.
   * Uses shallow-equality memoization so the listener is invoked ONLY when
   * the selected slice actually changes.
   * @param {Function} selectorFn - (state) => slice
   * @param {Function} listener - (slice, prevSlice) => void
   * @returns {Function} Unsubscribe function
   */
  select(selectorFn, listener) {
    let currentSlice = selectorFn(this._state);

    const subscription = () => {
      const nextSlice = selectorFn(this._state);
      if (!shallowEqual(currentSlice, nextSlice)) {
        const prevSlice = currentSlice;
        currentSlice = nextSlice;
        listener(nextSlice, prevSlice);
      }
    };

    this._listeners.add(subscription);
    return () => this._listeners.delete(subscription);
  }

  _notify() {
    for (const listener of this._listeners) {
      try {
        listener(this._state);
      } catch (err) {
        console.error('Store subscription listener error:', err);
      }
    }
  }
}

export function createStore(reducer, initialState) {
  return new Store(reducer, initialState);
}
