# Navetra

Navetra is a historical inventory-shortage research prototype for the IBM Z Datathon. It uses Sierra Leone health-facility records to evaluate stockout prediction; it is not a live Indian inventory system.

> The routed research pages use the FastAPI dataset and model endpoints. They do not claim current stock, suppliers, purchase orders, delivery dates, lead times, costs, or procurement actions. A legacy synthetic browser demo remains available only on non-research detail/settings surfaces.

## What is included

| Page | Purpose |
| --- | --- |
| Overview | Historical dataset coverage, model readiness, and held-out evaluation |
| Inventory | Paginated historical facilities and product summaries |
| Item detail | Legacy synthetic demo detail route; not connected to the research dataset |
| Shortage forecasts | Next-month model estimate plus observed facility-product history |
| Recommendations | Historical product/facility evidence and explicit operational limitations |
| What-if simulator | Transparent arithmetic scenario using only user-supplied assumptions |
| Analytics | Historical backtest metrics and dataset summary |
| Reports | Historical coverage, evaluation metrics, and model metadata |
| Settings | Legacy browser-demo preferences |

## Quick start

Requirements: Node.js 22 (the project is developed and tested on Node 22.22.3 with npm 10.9.8).

```bash
npm install
npm run dev        # http://localhost:5173 (binds 0.0.0.0)
```

Other scripts: `npm run build`, `npm run preview`, `npm test`, `npm run typecheck`. Details are in [DEVELOPMENT.md](DEVELOPMENT.md).

## Status

- **Working research experience:** the seven primary routes call the FastAPI historical summary, facility, product, history, forecast, backtest, health, and ML forecast endpoints. Disconnected and empty states are explicit; no invented fallback values are shown.
- **Backend research prototype:** `backend/main.py` reads `data/processed/S2_Dhis2Data.csv`. This is not a live inventory API.
- **Not built:** a production database, user accounts, current stock integration, supplier/order integration, or deployment artifact registry.
- **Verified:** TypeScript typecheck, the production build and the automated test suite (see DEVELOPMENT.md for the commands and counts).

## Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md): setup, project layout, testing, preview and deployment notes, how to continue in VS Code
- [docs/CALCULATIONS.md](docs/CALCULATIONS.md): every formula, rule and threshold, and what each one does and does not mean
- [docs/DATA_AND_API.md](docs/DATA_AND_API.md): historical dataset, API contracts, model pipeline, and remaining demo boundaries
- [docs/DESIGN.md](docs/DESIGN.md): visual system, colour meaning, accessibility choices

## Licence

Not yet decided. Add a licence before publishing the repository publicly.
