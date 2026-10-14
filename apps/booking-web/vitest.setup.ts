import "@testing-library/jest-dom/vitest";

// Vitest 4 + jsdom: localStorage ist nicht zuverlässig vollständig verfügbar.
// Wir ersetzen ihn durch ein einfaches In-Memory-Polyfill, damit zustand-persist
// in Unit-Tests deterministisch arbeitet.
const _store = new Map<string, string>();
const _localStorage: Storage = {
  get length() {
    return _store.size;
  },
  clear: () => _store.clear(),
  getItem: (key: string) =>
    _store.has(key) ? (_store.get(key) as string) : null,
  key: (i: number) => Array.from(_store.keys())[i] ?? null,
  removeItem: (key: string) => {
    _store.delete(key);
  },
  setItem: (key: string, value: string) => {
    _store.set(key, value);
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: _localStorage,
  configurable: true,
  writable: true,
});
