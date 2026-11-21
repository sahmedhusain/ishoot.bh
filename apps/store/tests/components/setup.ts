import "@testing-library/jest-dom/vitest";
import * as React from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

export const mockNavigation = {
  pathname: "/en",
  searchParams: new URLSearchParams(),
  params: { locale: "en" } as Record<string, string>,
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockNavigation.push,
    replace: mockNavigation.replace,
    refresh: mockNavigation.refresh,
    back: mockNavigation.back,
    prefetch: mockNavigation.prefetch,
  }),
  usePathname: () => mockNavigation.pathname,
  useSearchParams: () => mockNavigation.searchParams,
  useParams: () => mockNavigation.params,
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  permanentRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_PERMANENT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string | { pathname?: string } }) =>
    React.createElement(
      "a",
      { href: typeof href === "string" ? href : href?.pathname ?? "#", ...props },
      children,
    ),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt = "",
    fill: _fill,
    priority: _priority,
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    priority?: boolean;
    unoptimized?: boolean;
  }) => React.createElement("img", { src: typeof src === "string" ? src : "", alt, ...props }),
}));

vi.mock("next/script", () => ({
  default: ({ id, dangerouslySetInnerHTML, children }: Record<string, unknown>) =>
    React.createElement(
      "div",
      {
        "data-testid": typeof id === "string" ? `script-${id}` : "next-script",
        "data-script":
          (dangerouslySetInnerHTML as { __html?: string } | undefined)?.__html ?? "",
      },
      children as React.ReactNode,
    ),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-nonce": "test-nonce" }),
  cookies: async () => ({
    get: () => undefined,
    getAll: () => [],
  }),
}));

vi.mock("@material/web/ripple/ripple.js", () => ({}));

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn((query: string) => ({
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

  window.scrollTo = vi.fn();
  window.print = vi.fn();

  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);

  class IntersectionObserverMock {
    private cb: IntersectionObserverCallback;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private targets = new Set<Element>();
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe = (el: Element) => {
      this.targets.add(el);
      if (!this.timer) {
        this.timer = setTimeout(() => {
          this.timer = null;
          const entries = [...this.targets]
            .filter((t) => t.isConnected)
            .map((target) => ({ target, isIntersecting: true, intersectionRatio: 1 }) as IntersectionObserverEntry);
          if (entries.length) this.cb(entries, this as unknown as IntersectionObserver);
        }, 0);
      }
    };
    unobserve = (el: Element) => {
      this.targets.delete(el);
    };
    disconnect = () => {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.targets.clear();
    };
    takeRecords = () => [];
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);

  const createMemoryStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(String(key)) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(String(key));
      },
      setItem: (key: string, value: string) => {
        store.set(String(key), String(value));
      },
    };
  };
  const memLocal = createMemoryStorage();
  const memSession = createMemoryStorage();
  Object.defineProperty(window, "localStorage", { configurable: true, value: memLocal });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: memLocal });
  Object.defineProperty(window, "sessionStorage", { configurable: true, value: memSession });
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: memSession });
}

if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = function show() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
}

if (typeof Element !== "undefined") {
  Element.prototype.scrollIntoView = vi.fn();
}

if (typeof URL !== "undefined") {
  if (!URL.createObjectURL) URL.createObjectURL = vi.fn(() => "blob:test-object-url");
  if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockNavigation.pathname = "/en";
  mockNavigation.searchParams = new URLSearchParams();
  mockNavigation.params = { locale: "en" };
  document.body.style.overflow = "";
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-site-mode");
  document.documentElement.removeAttribute("data-site-tone");
  localStorage.clear();
  sessionStorage.clear();
});
