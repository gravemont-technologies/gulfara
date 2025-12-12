import '@testing-library/jest-dom';
import React from 'react';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

function createMockComponent(name: string) {
  return ({ children, ...rest }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-mock': name, ...rest }, children);
}

afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined') {
  if (typeof (window as any).ResizeObserver === 'undefined') {
    (window as any).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (typeof (window as any).MutationObserver === 'undefined') {
    (window as any).MutationObserver = class {
      constructor(cb?: MutationCallback) {
        this.callback = cb;
      }
      callback?: MutationCallback;
      observe() {
        // no-op in tests
      }
      disconnect() {
        // no-op
      }
      takeRecords(): MutationRecord[] {
        return [];
      }
    } as any;
  }

  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = (query: string) => {
      return {
        media: query,
        matches: false,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      } as MediaQueryList;
    };
  }

  if (typeof window.ResizeObserver === 'undefined') {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  }

  vi.mock('framer-motion', () => {
    const handler = () => createMockComponent('motion');
    const motionProxy = new Proxy(
      {},
      {
        get: () => handler(),
      },
    );

    return {
      motion: motionProxy,
      AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
        React.createElement(React.Fragment, null, children),
    };
  });

  vi.mock('recharts', () => {
    const Mock = createMockComponent('recharts');
    return {
      ResponsiveContainer: Mock,
      LineChart: Mock,
      Line: Mock,
      XAxis: Mock,
      YAxis: Mock,
      CartesianGrid: Mock,
      Tooltip: Mock,
      PieChart: Mock,
      Pie: Mock,
      Cell: Mock,
      BarChart: Mock,
      Bar: Mock,
      Legend: Mock,
      AreaChart: Mock,
      Area: Mock,
    };
  });

  const storage = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    },
    configurable: true,
  });
}


