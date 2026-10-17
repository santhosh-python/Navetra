# Development guide

## Prerequisites

- Node.js 22.12+ and npm (the current Vite toolchain requires a recent Node 22 release)
- Git
- No Python runtime is needed for the frontend demo; there is no Python service in this repository yet

## Install and run

```bash
cd frontend
npm ci
cp .env.example .env.local   # optional for the demo
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local`. The local configuration file is ignored by Git. The app runs from the synthetic snapshot without a backend.

`VITE_API_BASE_URL` defaults to `/api`. `VITE_DEV_API_TARGET` is used only by Vite's **server-side** development proxy when a local Python API is available. Browser code uses the relative `/api` path, not a hardcoded `localhost` URL. The current UI makes no live API calls, and `inventoryService.ts` is an explicit local demo adapter.

## Checks and production build

```bash
npm test       # calculation, selector, CSV, analytics, and scenario tests
npm run build  # TypeScript check and production bundle in frontend/dist/
npm run preview
```

`frontend/dist/` is generated output and ignored by Git. A production host must serve static assets and provide an SPA fallback to `index.html` for React Router.

## Where to make changes

- Route registration and route-level code splitting: `src/app/router.tsx`
- Page components: `src/pages/`
- Shared navigation/layout: `src/components/layout/`
- Common UI, charts, and inventory interactions: `src/components/`
- Synthetic records and defaults: `src/data/`
- Pure calculations, metrics, selectors, recommendations, scenario simulation, and CSV tools: `src/lib/`
- API boundary and local inventory adapter: `src/services/`
- Shared app state: `src/app/providers.tsx` and `src/hooks/useAppState.ts`
- Models: `src/types/`
- Near-white neutral/amber design tokens and responsive styles: `src/styles/tokens.css` and `src/styles/globals.css`
- Tests: `tests/`

## Current behavior and service boundary

- One 18-record synthetic inventory snapshot dated 2026-10-17 drives the demo KPIs, inventory, risk views, and rule-based recommendations. The synthetic history and delivery files are labeled in the UI.
- CSV upload maps source columns, parses and validates in-browser, previews row errors, and only replaces the local dataset after valid rows are processed. Excel workbook parsing is not implemented.
- Inventory edits/imports, settings, notification reads, recommendation status/action notes, and saved what-if scenarios live in React state only and reset on reload.
- Supplier follow-up is a local reminder, not an email or external action. No purchase order is placed.
- The API client and forecast/recommendation service boundaries are typed scaffolding for a future backend contract. No endpoint is called by this demo, and frontend fallback data is not presented as a server response.
- `VITE_*` values are public build-time settings and must never contain secrets. Keep frontend dependencies in `frontend/package.json`; a future Python service should have a separate `backend/requirements.txt`.

## VS Code and GitHub

Open the repository root in VS Code, then use the integrated terminal:

```bash
cd frontend
npm ci
npm run dev
```

`docs/VS_CODE_HANDOFF.md` includes the repository map, continuation notes, and Python/s390x integration checklist. The active Arena branch is `arena/c52aa62e-navetra`; preserve it for work in this session.

## Before IBM Z LinuxONE / s390x deployment

1. Install Node.js/npm and resolve dependencies on the target architecture; verify Vite, Recharts, and every native/transitive package there.
2. Build and run the frontend on the target, then execute the tests and smoke tests.
3. Add the Python API in its own directory and dependency manifest, with a reviewed request/response contract and runtime schema validation.
4. Configure the production host to serve `frontend/dist/`, route frontend paths to `index.html`, and proxy `/api` to the service.
5. Run integration tests and security checks on the target platform before claiming support.

IBM Z LinuxONE/s390x execution has **not** been performed.
