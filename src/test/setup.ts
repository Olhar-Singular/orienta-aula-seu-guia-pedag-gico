import "@testing-library/jest-dom";
import { vi } from "vitest";

// Polyfill Promise.withResolvers para Node < 22 (usado por pdfjs-dist)
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== "function") {
  (Promise as unknown as { withResolvers: <T>() => { promise: Promise<T>; resolve: (v: T) => void; reject: (r?: unknown) => void } }).withResolvers = function withResolvers<T>() {
    let resolve!: (v: T) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// Mock do matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock do ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock do IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
window.scrollTo = vi.fn() as any;

// Mock URL.createObjectURL / revokeObjectURL
URL.createObjectURL = vi.fn(() => "blob:test");
URL.revokeObjectURL = vi.fn();
