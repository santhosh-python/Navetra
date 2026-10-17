# Development guide

This guide is for continuing Navetra in VS Code or any editor. The app is a single-page React + TypeScript application built with Vite. There is no server-side code yet.

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
| `VITE_API_BASE_URL` | empty | Empty: use the synthetic demo data inside the browser. Set: services call the planned API. The API does not exist yet. |

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
  services/                The only place that talks to data sources or HTTP
  data/                    Synthetic demo inventory, deliveries and 30-day history
  types/                   Shared TypeScript types
  styles/                  Design tokens, global styles, utilities, component styles
tests/                     Vitest suites (*.test.ts) and a jsdom render test (*.test.tsx)
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

The suite does not include browser end-to-end tests, accessibility audits or visual regression tests. Those are good next steps once the backend exists.

## Working in VS Code

- Install the recommended TypeScript and ESLint extensions if you add them. The project uses the TypeScript version in `node_modules`, so select "Use Workspace Version" if VS Code asks.
- `npm run typecheck` is the fastest feedback loop. `npm test -- --watch` keeps tests running as you edit.
- When adding a calculation, write its test first in `tests/` and keep the function in `src/lib/`.

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
- No accessibility audit or visual review has been completed in a real browser yet.
- Platform compatibility beyond the Node version above has not been tested. No claims are made for other architectures.
