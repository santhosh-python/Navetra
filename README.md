# Navetra

Navetra is an inventory-intelligence web app for essential supplies in clinics, hospitals, hostels, pharmacies, labs and emergency teams. It shows when each item is likely to run out, ranks what needs attention first, and suggests reorder quantities with the reasoning visible.

> **All data in this repository is synthetic demo data.** Items, suppliers, deliveries and history are invented for the demonstration. Forecasts are rule-based estimates, not machine-learning predictions, and nothing in the app places orders or contacts suppliers.

## What is included

| Page | Purpose |
| --- | --- |
| Overview | Four summary cards, risk donut that filters a table, stock-out timeline, consumption vs stock, at-risk trend, "Needs attention" list |
| Inventory | Search, filters, sorting, paging, bulk actions, add/edit, CSV export, CSV import with row-by-row checks |
| Item detail | Tabs for Overview, Forecast, Deliveries and Activity |
| Shortage forecasts | Depletion chart, plain-language explanation, stated assumptions |
| Recommendations | Ranked list with a disclosed priority breakdown; mark reviewed, snooze, record action |
| What-if simulator | Demand, delivery delay, early order and transfer scenarios against a baseline; presets; save in session |
| Analytics | Seven charts built from the same calculations |
| Reports | Six report types with print layout and CSV export |
| Settings | Risk thresholds, reorder policy, locations, categories, notifications, display |

## Quick start

Requirements: Node.js 22 (the project is developed and tested on Node 22.22.3 with npm 10.9.8).

```bash
npm install
npm run dev        # http://localhost:5173 (binds 0.0.0.0)
```

Other scripts: `npm run build`, `npm run preview`, `npm test`, `npm run typecheck`. Details are in [DEVELOPMENT.md](DEVELOPMENT.md).

## Status

- **Working in the browser today:** all nine pages, using synthetic demo data held in the browser. Edits, imports, notifications and scenarios last for the current session only. Settings are saved in this browser.
- **Not built yet:** a backend API, a database, user accounts, Excel import, and real email or supplier integration. The service layer documents the planned API contract (see [docs/DATA_AND_API.md](docs/DATA_AND_API.md)), but no server exists.
- **Verified:** TypeScript typecheck, the production build and the automated test suite (see DEVELOPMENT.md for the commands and counts).

## Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md): setup, project layout, testing, preview and deployment notes, how to continue in VS Code
- [docs/CALCULATIONS.md](docs/CALCULATIONS.md): every formula, rule and threshold, and what each one does and does not mean
- [docs/DATA_AND_API.md](docs/DATA_AND_API.md): CSV import rules, persistence, demo data, and the planned backend contract
- [docs/DESIGN.md](docs/DESIGN.md): visual system, colour meaning, accessibility choices

## Licence

Not yet decided. Add a licence before publishing the repository publicly.
