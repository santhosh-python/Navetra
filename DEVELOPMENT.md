# Development guide

This guide is for continuing Navetra in VS Code or any editor. The app is a single-page React + TypeScript application built with Vite. A separate FastAPI research prototype lives in `backend/` and reads the historical dataset in `data/processed/`.

## Setup

```bash
git clone <your-repository-url> navetra
cd navetra
npm install
cp .env.example .env.local   # optional; leave VITE_API_BASE_URL empty for demo mode
npm run dev
```

Open the address Vite prints. The dev server listens on `0.0.0.0`, so it is reachable from other machines on your network and from the sandbox preview proxy.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173, host 0.0.0.0 |
| `npm run build` | Typecheck (`tsc --noEmit`) then production build to `dist/` |
| `npm run preview` | Serves `dist/` on port 4173, host 0.0.0.0 |
| `npm run typecheck` | TypeScript check for `src/`, `tests/` and `vite.config.ts` |
| `npm test` | Vitest: calculation, data, import, analytics, report, notification and render tests |

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | empty | Legacy synthetic browser-demo service only; not used by the seven research routes. |
| `VITE_RESEARCH_API_BASE_URL` | empty | FastAPI historical research service. Required for real data in research routes. |

Only `VITE_`-prefixed variables reach the browser bundle, so never put secrets in them. `.env`, `.env.*` and `.env.local` are git-ignored. `.env.example` is committed.

Do not hardcode `localhost`, machine paths or credentials in source. Put configurable values in environment variables and document them in `.env.example`.

## Project layout

```
index.html                 Vite entry document
src/
  main.tsx                 Mounts <App/> and loads global styles and the Inter font
  app/                     App route table, navigation config, provider composition
  pages/                   One file per route (Overview, Inventory, ...)
  components/
    common/                Buttons, dialogs, forms, tables, badges, toasts
    layout/                App shell, sidebar, topbar, global search, notifications
    charts/                Recharts wrappers and the accessible chart figure
    inventory/             Item form, table, import dialog
    recommendations/       Recommendation card, record-action dialog
    forecasts/ simulator/ settings/ dashboard/
  state/                   React contexts: inventory, settings, notifications, activity, simulator
  hooks/                   Thin hooks over the contexts and utilities
  lib/                     Pure calculations and rules (no React). Unit-tested.
  services/                The only place that talks to browser data sources or HTTP
  data/                    Synthetic demo inventory, deliveries and 30-day history
  types/                   Shared TypeScript types
  styles/                  Design tokens, global styles, utilities, component styles
tests/                     Vitest suites (*.test.ts) and a jsdom render test (*.test.tsx)
backend/                   FastAPI historical research endpoints and unittest tests
docs/                      Calculations, data/API contract, design notes
```

Key rule: calculations live in `src/lib/` as pure functions. Pages and components call them; they do not re-implement them. This keeps the numbers on every page identical and testable.

## Routing and deployment

Routes use `BrowserRouter`, so URLs such as `/inventory/MED-ORS-001` are real paths. A static host must serve `index.html` for any unknown path (an SPA fallback). Without it, a page reload on a deep link returns 404.

- Vite dev server and `vite preview`: handled automatically.
- Netlify: add `/* /index.html 200` to a `_redirects` file in `public/`.
- Vercel: add `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` to `vercel.json`.
- Nginx: `try_files $uri /index.html;`.

No deployment target is configured in this repository.

## Testing

Run `npm test`. The suite has two layers:

- **Pure logic tests** (`tests/*.test.ts`): calculations, scenarios, demo data, CSV parsing and round-trip, validators, the inventory schema, filtering, analytics builders, report builders, notification rules, portfolio summaries and the at-risk trend.
- **Render test** (`tests/app.render.test.tsx`): mounts the whole app in jsdom and checks each route renders its main heading with no unexpected console errors. It does not test layout or visual appearance.

The suite does not include browser end-to-end tests, accessibility audits or visual regression tests. A one-off headless-Chromium check was run on every route at desktop and phone widths. It found no console errors, page errors or horizontal overflow. Its scripts are not in the repository. Add automated browser tests once the backend exists.

## Working in VS Code

- Install the recommended TypeScript and ESLint extensions if you add them. The project uses the TypeScript version in `node_modules`, so select "Use Workspace Version" if VS Code asks.
- `npm run typecheck` is the fastest feedback loop. `npm test -- --watch` keeps tests running as you edit.
- When adding a calculation, write its test first in `tests/` and keep the function in `src/lib/`.

## Backend research prototype

From the repository root, run the backend with the virtual environment in `backend/.venv`:

```powershell
backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

The backend reads historical Sierra Leone health-facility records, not live Indian inventory. Its backtest is a one-month-ahead evaluation using six prior consecutive calendar months. The default final test window is January through November 2023. The target is the source `stockout` flag equal to `1`; it is not replaced with a derived `closeBalance == 0` rule.

Run the backend regression tests with:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m unittest discover -v
```

Train the reproducible historical model from the repository root:

```powershell
backend\.venv\Scripts\python.exe -m backend.train_model
```

This creates ignored artifacts under `backend/artifacts/`. The model uses
`stockout == 1` as its target and only rows with six prior consecutive calendar
months. Training covers April 2020 through December 2021, validation covers
January through December 2022, and the held-out test covers January through
November 2023. The decision threshold is selected on validation data only.

The trained run currently produced these held-out test results:

| Model | Accuracy | Precision | Recall | F1 | Average precision | ROC-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Stock-based rule | 80.50% | 26.00% | 60.02% | 36.29% | — | — |
| Persistence baseline | 86.69% | 15.09% | 9.49% | 11.65% | — | — |
| HistGradientBoosting (`0.11` threshold) | 80.66% | 28.15% | 70.26% | 40.19% | 34.20% | 83.75% |

The model improves F1, precision and recall over the stock rule, but has lower
accuracy. It is a historical research estimate, not a calibrated live risk
probability or an operational inventory decision.

Set `VITE_RESEARCH_API_BASE_URL` in `.env.local` to the running FastAPI URL
(for local development, `http://127.0.0.1:8000`) to load the Research Data page.
The seven primary research routes report real responses from the FastAPI
summary, facilities, products, history, ML forecast, health, and backtest
endpoints. If this variable is empty or the backend is unavailable, the UI
shows an explicit error and retry control; it does not fall back to invented
operational values. The legacy item-detail/settings surfaces retain synthetic
demo support because the research dataset has no supplier, lead-time, cost, or
order-management fields.

## Conventions

- Dates are calendar strings (`YYYY-MM-DD`). Arithmetic is UTC, so results do not depend on the machine's timezone.
- Currency is Indian rupees (`₹`, en-IN number formatting).
- Use the risk label text as well as colour. Icons and labels must carry the meaning.
- Every visible control must work, or be clearly labelled as a planned integration. Do not show success messages for actions that did not happen.
- Forecast and priority outputs must stay labelled as rule-based estimates, with weights disclosed.

## Known limitations

- Data is held in memory in the browser. Refreshing the page restores the demo data, except for settings, which are saved in `localStorage`.
- Excel (`.xlsx`) import is deferred. Only browser-parsed CSV is supported.
- Recharts is in the Overview chunk, so the first load is large (about 650 kB before gzip). Other pages are loaded on demand.
- The visual review covered headless Chromium screenshots of every route at desktop (1360 px) and phone (390 px) widths. It was a one-off check, not an automated suite. A full accessibility audit has not been done.
- Platform compatibility beyond the Node version above has not been tested. No claims are made for other architectures.
