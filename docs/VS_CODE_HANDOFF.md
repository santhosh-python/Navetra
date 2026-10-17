# VS Code handoff

## Current scope

This repository contains a working, frontend-only Navetra prototype: responsive multi-page inventory views, synthetic demo data, transparent deterministic calculations, CSV import/export, report printing, and local scenario/review interactions. It is not connected to an operational inventory system or Python backend. UI state is held in memory and resets on reload.

## Project structure

- `frontend/` is the single frontend application; do not create a competing app at the repository root.
- `frontend/src/app/` contains routing, providers, and app composition.
- `frontend/src/pages/` contains Overview, Inventory, Forecasts, Recommendations, Simulator, Analytics, Reports, Settings, Item Detail, and Not Found pages.
- `frontend/src/components/layout/` contains persistent responsive navigation and the top bar.
- `frontend/src/components/charts/` contains reusable risk, stock, timeline, trend, and category chart components.
- `frontend/src/components/inventory/` contains inventory forms/table, CSV import flow, and local supplier follow-up note modal.
- `frontend/src/components/common/` contains reusable UI elements such as buttons, filters, loading/empty states, status badges, tooltips, modals, and toast support. The inventory table is in `frontend/src/components/inventory/InventoryTable.tsx`.
- `frontend/src/data/` contains the 18-record synthetic inventory fixture, generated usage history, demo deliveries, demo organizations, and default settings.
- `frontend/src/lib/` contains pure calculations, inventory metrics/selectors, transparent recommendations, scenario simulation, CSV parsing/validation, formatting, and export helpers.
- `frontend/src/services/` contains the explicit local inventory adapter and typed API client/service boundaries. No live API response is faked.
- `frontend/src/types/` contains typed inventory, delivery, forecast, risk, recommendation, organization, scenario, and app-state models.
- `frontend/src/styles/` contains near-white neutral/amber design tokens and the responsive/accessibility-aware global styles.
- `frontend/tests/` covers calculations, selectors, CSV validation, demand-variability transforms, and the what-if simulator.
- `docs/` contains handoff and integration notes. The future Python API belongs in `backend/` with its own `requirements.txt`.

## Existing frontend service files and actual usage

- `frontend/src/services/inventoryService.ts` exports `getInventoryDataset()`. It is used by `AppStateProvider` on initial load and returns cloned records from `demoInventory.ts` with source `demo`; it does not call an API.
- `frontend/src/services/apiClient.ts` exports `requestJson<T>()`, a relative-URL JSON fetch helper. It checks HTTP status and JSON content type, but does not validate the response shape at runtime.
- `frontend/src/services/forecastService.ts` exports `getForecasts()` for `/forecasts`. It calls `requestJson`, but no page/component currently calls `getForecasts()`.
- `frontend/src/services/recommendationService.ts` exports `getRecommendations()` for `/recommendations`. It calls `requestJson`, but no page/component currently calls `getRecommendations()`.
- The UI calculates current forecasts and recommendations locally through `src/lib/`; those service modules are integration scaffolding, not the source of the page data.
- `components/inventory/ImportModal.tsx` makes a direct relative fetch only for the packaged `/sample-data/inventory-sample.csv`. A user-selected CSV is read and validated in the browser; it is not uploaded to a server.

## Continue in VS Code

The current worktree is attached to `santhosh-python/Navetra` on the session branch `arena/c52aa62e-navetra`. Keep work on that branch for this Arena session. The current changes are not committed or pushed. Arena Agent Mode exposes source files and normal GitHub workflow rather than a separate visual-builder export flow.

To run from a clone:

```bash
cd frontend
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` only if configuring local API routing. The current demo does not require that file. `VITE_API_BASE_URL` is public configuration; do not place secrets in `VITE_*` variables.

## Where common changes belong

1. **Routes:** `src/app/router.tsx`; route pages are lazy-loaded from `src/pages/`.
2. **Reusable interface:** `src/components/` with shared layout/UI outside page files and business-domain components in their feature folders.
3. **Demo source records:** `src/data/demoInventory.ts` (18 synthetic items; snapshot date is `2026-10-17`). Keep generated history/delivery data clearly synthetic and derived from those records.
4. **Calculations:** `src/lib/calculations.ts`, `inventoryMetrics.ts`, and `simulator.ts`. Keep rules documented, deterministic, and covered by tests.
5. **Recommendations:** `src/lib/recommendations.ts`. Explain quantities/priority; do not add fabricated AI confidence, savings, or external-action success.
6. **CSV workflow:** `src/lib/csv.ts` and `components/inventory/ImportModal.tsx`. CSV parsing/validation is client-side; XLS/XLSX workbook parsing is explicitly unsupported. A successful state requires processed valid rows.
7. **Styling/accessibility:** `src/styles/tokens.css` and `globals.css`. Test keyboard operation, narrow layouts, contrast, and reduced-motion preferences when changing UI.
8. **Backend integration:** keep requests in `src/services/`. The browser uses a relative `/api` path; `VITE_DEV_API_TARGET` is only the Vite server-side proxy target. Define the Python API contract and runtime validation before connecting the UI.
9. **Dependencies:** JavaScript packages belong in `frontend/package.json`; future Python packages belong in `backend/requirements.txt`.

## Commands

- `npm run dev` — Vite development server
- `npm test` — calculation, selector, CSV, analytics-variability, and simulator helper tests; no UI/browser tests are currently present.
- `npm run build` — TypeScript check and production bundle at `frontend/dist/`
- `npm run preview` — serve the production bundle locally

## Honest feature boundaries

- Inventory snapshot date and history are synthetic; they are not live stock or verified hospital activity.
- Forecasts and recommendations are transparent starter rules, not a machine-learning service.
- Settings, imported items, edits, saved scenarios, notifications, and actions are session-local only.
- Supplier follow-up records a local reminder; there is no live email, push notification, supplier API action, or purchase order.
- Persistent storage, a verified real dataset, Excel import, account/auth, scheduled reports, PDF generation, actual lead-time performance, verified turnover, and real stock-out analytics are not implemented.
- No Python backend, database, Docker configuration, or deployment stack has been added. The inventory snapshot and historical observations remain synthetic demo data.

## IBM Z LinuxONE / s390x checklist

1. Install Node.js/npm on the target architecture and validate dependency availability there; do not assume compatibility based on x86 builds.
2. Run `npm ci`, `npm test`, `npm run build`, and browser smoke tests on the target.
3. Add the Python service independently under `backend/` with a separate requirements file and documented API schema.
4. Serve `frontend/dist/` with SPA fallback and route `/api` to the backend without exposing credentials in browser code.
5. Test frontend/backend integration, logging, security, performance, and accessibility on the target before claiming support.

LinuxONE/s390x has **not** been tested in this work.
