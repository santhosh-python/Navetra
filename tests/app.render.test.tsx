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

describe('every page renders with the demo data', () => {
  for (const route of ROUTES) {
    it(`renders ${route.path} without runtime errors`, async () => {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      window.history.pushState({}, '', route.path);
      render(<App />);
      const heading = await screen.findByRole('heading', { level: 1, name: route.heading }, { timeout: 4000 });
      expect(heading).toBeTruthy();
      expect(screen.getAllByText(/synthetic/i).length).toBeGreaterThan(0);
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

  it('shows the demo data notice on the overview page', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    await waitFor(() => expect(screen.getAllByText(/demo data/i).length).toBeGreaterThan(0));
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

  it('filters the overview by location and clears the filter', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    const locationSelect = (await screen.findByLabelText(/^location$/i)) as HTMLSelectElement;
    const firstLocation = Array.from(locationSelect.options).find((option) => option.value !== 'all')?.value;
    expect(firstLocation).toBeTruthy();
    fireEvent.change(locationSelect, { target: { value: firstLocation } });
    expect(await screen.findByRole('button', { name: /clear filters/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /clear filters/i })).toBeNull());
  });

  it('opens the account menu with working items', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /account menu/i }));
    expect(await screen.findByRole('menuitem', { name: /^settings$/i })).toBeTruthy();
  });

  it('opens the import dialog from the import link', async () => {
    window.history.pushState({}, '', '/inventory?import=1');
    render(<App />);
    expect(await screen.findByRole('dialog', {}, { timeout: 4000 })).toBeTruthy();
  });

  it('records a supplier contact only as a note, through a dialog', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    const buttons = await screen.findAllByRole('button', { name: /record supplier contact/i });
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[0]);
    expect(await screen.findByRole('dialog', { name: /record an action/i })).toBeTruthy();
    // The dialog opens with the supplier-contact option already selected.
    expect(screen.getByDisplayValue(/supplier contacted by phone or email/i)).toBeTruthy();
  });
});
