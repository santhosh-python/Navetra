# Navetra

Navetra is a responsive frontend prototype for essential-supply inventory planning, shortage forecasting, and replenishment review. The repository contains a working React application with synthetic demo data; it does **not** contain or simulate a live Python service.

## Run locally

```bash
cd frontend
npm ci
cp .env.example .env.local   # optional; the defaults work for the demo
npm run dev
```

The Vite server prints its local URL. See [DEVELOPMENT.md](./DEVELOPMENT.md) for commands and the [VS Code handoff](./docs/VS_CODE_HANDOFF.md) for project structure and integration notes.

## Product pages

- **Overview (`/`)** — derived inventory KPIs, clickable risk distribution, stock-out timeline, consumption/stock estimate, risk trend, and prioritised attention list.
- **Inventory (`/inventory`)** — search, URL-backed filters, sorting, pagination, selection, CSV export/import, add/edit, and item details.
- **Forecasts (`/forecasts`)** — item-specific stock-cover and delivery estimates with transparent assumptions and configurable horizons.
- **Recommended Actions (`/recommendations`)** — rule-based priority explanations, local review/snooze state, action notes, and a supplier follow-up reminder (no message is sent).
- **What-If Simulator (`/simulator`)** — interactive demand, delivery-delay, order-quantity, and safety-stock controls with baseline comparison; scenarios are saved in browser memory only.
- **Analytics (`/analytics`)** — synthetic daily consumption trend and period-relative variability, clickable category-risk rows, an item-level risk scatter plot, configured supplier lead-time profile, and explicit empty states where verified operational history is unavailable.
- **Reports (`/reports`)** — filtered inventory, shortage, replenishment, reorder, consumption, and assumptions reports; print and CSV export are client-side.
- **Settings (`/settings`)** — demo organization scope, derived locations/categories and item-level supply defaults, configurable risk buffers and forecast horizon, safety-stock defaults, notifications, and table density.
- **Item details (`/items/:itemId`)** — overview, forecast, inbound delivery, and local activity tabs.

Desktop navigation collapses to a mobile drawer. Global search, organization switching, notification review, filters, modals, and page actions use local frontend state.

## Demo data, calculations, and limitations

- `frontend/src/data/demoInventory.ts` is the single 18-item synthetic inventory snapshot dated **2026-10-17**. KPIs, charts, tables, forecasts, and recommendations derive from those shared records. `demoHistory.ts` and `demoDeliveries.ts` are explicitly synthetic sample records.
- Risk bands use stock coverage, minimum stock, supplier lead time, and configurable coverage buffers. Reorder quantity uses the documented starter rule `minimum + safety stock + lead-time demand - on-hand - incoming`, rounded up at zero. These are deterministic illustrations, not validated clinical policies, machine-learning predictions, or operational outcomes.
- Import parsing and validation run in the browser for CSV. XLS/XLSX workbook parsing is **not implemented**. A successful import message is shown only after valid CSV rows have been processed; import changes replace the in-memory demo dataset for the current page session.
- Settings, item edits, recommendation notes/statuses, notification reads, and saved scenarios are not persisted and reset on reload. Supplier contact buttons record a local reminder only; they do not send email, contact suppliers, place orders, or write to a server.
- Analytics intentionally leaves turnover, actual supplier performance, and real stock-out history uncalculated because verified receipts/issues/incident data are not present.
- PDF generation, scheduled reports, authentication, database storage, and live backend integration are not connected.

## Stack and repository map

- React 19, TypeScript, Vite, React Router, Lucide, Recharts, PapaParse, Vitest.
- `frontend/src/pages/` — route-level page components.
- `frontend/src/components/` — reusable layout, chart, inventory, and common UI components.
- `frontend/src/data/` — synthetic inventory, history, delivery, organization, and default setting records.
- `frontend/src/lib/` — pure inventory calculations, selectors, scenario simulation, recommendations, formatting, and CSV parsing/export.
- `frontend/src/services/` — inventory demo adapter and typed API boundaries.
- `frontend/src/types/` — inventory, forecast, risk, delivery, recommendation, and app settings models.
- `frontend/src/styles/` — near-white neutral/amber design tokens and responsive global/page styles.
- `frontend/tests/` — calculation, selector, CSV, analytics-variability, and simulator tests.
- `docs/` — VS Code handoff and integration/deployment checklist.

The UI is deliberately a single frontend in `frontend/`. The future Python service belongs in a separate `backend/` directory with its own dependency manifest; no Python backend or `requirements.txt` is included here.

## Checks

```bash
cd frontend
npm test
npm run build
```

The production bundle is written to `frontend/dist/` (ignored by Git). API calls must remain in `src/services/`; configure `VITE_API_BASE_URL` when the real service contract is ready. For local backend development, `VITE_DEV_API_TARGET` is used by Vite's server-side `/api` proxy—the browser still calls the relative `/api` path. Never put secrets in `VITE_*` variables.

## GitHub and VS Code handoff

This work is in the session branch `arena/c52aa62e-navetra`; it is not committed or pushed. Continue from the repository working tree, or use **Git: Clone** in VS Code after pushing/reviewing through the normal GitHub workflow. IBM Z LinuxONE/s390x portability is a documented follow-up checklist, **not claimed as tested**.
