// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from '../src/app/App';

// jsdom does not implement these browser APIs; the app uses them for reduced motion and chart sizing.
beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  // jsdom does not implement the native dialog methods that Modal uses. A simple stand-in sets the open attribute.
  if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const ROUTES: { path: string; heading: RegExp }[] = [
  { path: '/', heading: /overview/i },
  { path: '/inventory', heading: /inventory/i },
  { path: '/inventory/MED-ORS-001', heading: /oral rehydration|ors/i },
  { path: '/forecasts', heading: /forecast/i },
  { path: '/recommendations', heading: /recommendation/i },
  { path: '/simulator', heading: /simulator|what-if/i },
  { path: '/analytics', heading: /analytics/i },
  { path: '/reports', heading: /reports/i },
  { path: '/settings', heading: /settings/i },
];

describe('every page renders with honest research states', () => {
  for (const route of ROUTES) {
    it(`renders ${route.path} without runtime errors`, async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      window.history.pushState({}, '', route.path);
      render(<App />);
      const heading = await screen.findByRole('heading', { level: 1, name: route.heading }, { timeout: 4000 });
      expect(heading).toBeTruthy();
      const unexpected = errors.mock.calls.filter((call) => !String(call[0]).includes('not wrapped in act'));
      expect(unexpected).toEqual([]);
      errors.mockRestore();
    });
  }

  it('shows the not-found page for an unknown address', async () => {
    window.history.pushState({}, '', '/this-page-does-not-exist');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: /page not found/i })).toBeTruthy();
  });

  it('shows the research API request error when disconnected', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Research API is offline.'));
    window.history.pushState({}, '', '/research-data');
    render(<App />);
    expect(await screen.findByText(/research API is offline/i)).toBeTruthy();
    fetchSpy.mockRestore();
  });

  it('does not save a critical threshold that is not below the warning threshold', async () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);
    const critical = (await screen.findByLabelText(/critical: days of stock/i)) as HTMLInputElement;
    fireEvent.change(critical, { target: { value: '20' } });
    expect(await screen.findByText(/must be less than the warning threshold/i)).toBeTruthy();
    const saved = JSON.parse(window.localStorage.getItem('navetra.settings.v1') ?? '{}') as { criticalDaysThreshold?: number };
    expect(saved.criticalDaysThreshold).not.toBe(20);
  });

  it('saves a valid critical threshold', async () => {
    window.history.pushState({}, '', '/settings');
    render(<App />);
    const critical = (await screen.findByLabelText(/critical: days of stock/i)) as HTMLInputElement;
    fireEvent.change(critical, { target: { value: '5' } });
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem('navetra.settings.v1') ?? '{}') as { criticalDaysThreshold?: number };
      expect(saved.criticalDaysThreshold).toBe(5);
    });
  });

  it('opens the account menu with working items', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /account menu/i }));
    expect(await screen.findByRole('menuitem', { name: /^settings$/i })).toBeTruthy();
  });

});
