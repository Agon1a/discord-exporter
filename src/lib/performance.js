/**
 * Performance optimization utilities for Discord Exporter.
 * 
 * Provides lazy loading, debouncing, and memoization helpers
 * to improve extension performance.
 */

(() => {
  /**
   * Debounce function to limit repeated calls.
   * @template T
   * @param {T} fn - Function to debounce.
   * @param {number} delay - Delay in milliseconds.
   * @returns {T}
   */
  function debounce(fn, delay = 300) {
    let timeoutId = null;
    return function debounced(...args) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle function to limit call frequency.
   * @template T
   * @param {T} fn - Function to throttle.
   * @param {number} interval - Minimum interval between calls (ms).
   * @returns {T}
   */
  function throttle(fn, interval = 100) {
    let lastCall = 0;
    return function throttled(...args) {
      const now = Date.now();
      if (now - lastCall >= interval) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  }

  /**
   * Simple memoization cache for expensive computations.
   * @template T
   * @param {Function} fn - Function to memoize.
   * @param {number} ttl - Time-to-live in milliseconds (0 = no expiry).
   * @returns {Function}
   */
  function memoize(fn, ttl = 0) {
    const cache = new Map();
    const timestamps = new Map();

    return function memoized(...args) {
      const key = JSON.stringify(args);
      
      // Check cache with TTL
      if (cache.has(key)) {
        if (ttl === 0 || (Date.now() - timestamps.get(key)) < ttl) {
          return cache.get(key);
        }
        // Expired entry
        cache.delete(key);
        timestamps.delete(key);
      }

      // Compute and cache result
      const result = fn.apply(this, args);
      cache.set(key, result);
      timestamps.set(key, Date.now());
      return result;
    };
  }

  /**
   * Lazy-loads scripts to reduce initial load time.
   * @param {string} src - Script source.
   * @returns {Promise<void>}
   */
  function lazyLoadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Batch DOM updates to reduce reflows.
   * @param {Function} updates - Function containing DOM mutations.
   * @returns {void}
   */
  function batchDOMUpdates(updates) {
    if (document.activeElement) {
      document.activeElement.blur();
    }
    requestAnimationFrame(() => {
      updates();
    });
  }

  /**
   * Virtual scrolling placeholder for large lists.
   * Note: May be useful if export results UI is added.
   * @param {HTMLElement} container - Container element.
   * @param {Array} items - Items to render.
   * @param {number} itemHeight - Height per item in pixels.
   * @param {Function} renderItem - Function to render single item.
   * @returns {void}
   */
  function virtualScroll(container, items, itemHeight, renderItem) {
    const visibleCount = Math.ceil(container.clientHeight / itemHeight);
    const scrollTop = container.scrollTop;
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleCount + 1, items.length);

    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
      const el = renderItem(items[i], i);
      fragment.appendChild(el);
    }

    container.innerHTML = '';
    container.appendChild(fragment);
  }

  /**
   * Measure performance timing.
   * @param {string} label - Label for the measurement.
   * @param {Function} fn - Function to measure.
   * @returns {any}
   */
  function measurePerformance(label, fn) {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    return result;
  }

  /**
   * Optimize CSS selector queries with caching.
   * @param {string} selector - CSS selector.
   * @returns {HTMLElement | null}
   */
  const cachedQuerySelector = memoize((selector) => {
    return document.querySelector(selector);
  }, 5000); // Cache for 5 seconds

  /**
   * Lazy initialization pattern for heavy components.
   * @param {Function} initFn - Initialization function.
   * @param {HTMLElement} trigger - Element that triggers initialization.
   * @returns {void}
   */
  function lazyInit(initFn, trigger) {
    let initialized = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !initialized) {
        initialized = true;
        initFn();
        observer.disconnect();
      }
    });
    observer.observe(trigger);
  }

  const api = {
    debounce,
    throttle,
    memoize,
    lazyLoadScript,
    batchDOMUpdates,
    virtualScroll,
    measurePerformance,
    cachedQuerySelector,
    lazyInit
  };

  if (typeof window !== 'undefined') {
    window.DiscordExporterPerformance = api;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})();
