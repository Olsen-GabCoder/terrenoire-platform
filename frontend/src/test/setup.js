import '@testing-library/jest-dom/vitest'

// jsdom ne fournit pas matchMedia (utilisé pour prefers-reduced-motion, breakpoints...)
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom ne fournit pas IntersectionObserver (animations d'apparition au scroll)
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
