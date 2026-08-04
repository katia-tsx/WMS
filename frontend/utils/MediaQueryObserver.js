/**
 * Responsive JS-driven breakpoint observer wrapping window.matchMedia.
 * Managed Breakpoints:
 * - sm: <480px
 * - md: <768px (Tablet / Mobile threshold)
 * - lg: >=1024px (Desktop)
 * - xl: >=1440px (Wide Screen)
 */

class MediaQueryObserverManager {
  constructor() {
    this._listeners = new Set();
    this._queryMap = new Map();

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this._setupQueries();
    }
  }

  _setupQueries() {
    const breakpoints = {
      isMobile: '(max-width: 767px)',
      isTablet: '(min-width: 768px) and (max-width: 1023px)',
      isDesktop: '(min-width: 1024px)',
      isWide: '(min-width: 1440px)',
    };

    for (const [key, mediaQuery] of Object.entries(breakpoints)) {
      const mql = window.matchMedia(mediaQuery);
      this._queryMap.set(key, mql.matches);

      const onChange = (e) => {
        this._queryMap.set(key, e.matches);
        this._notify();
      };

      if (mql.addEventListener) {
        mql.addEventListener('change', onChange);
      } else if (mql.addListener) {
        mql.addListener(onChange);
      }
    }
  }

  getState() {
    return Object.fromEntries(this._queryMap);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    const snapshot = this.getState();
    for (const listener of this._listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('MediaQueryObserver listener error:', err);
      }
    }
  }
}

export const MediaQueryObserver = new MediaQueryObserverManager();
