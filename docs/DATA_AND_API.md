# Data, API contracts, and deployment boundaries

## Legacy synthetic demo data

The old browser inventory adapter remains for legacy detail/settings surfaces:

- `src/data/demoInventory.ts`: 18 items across medicines, laboratory supplies, emergency supplies, food and cleaning, with suppliers and locations invented for the demo.
- `src/data/demoDeliveries.ts`: scheduled and received deliveries.
- `src/data/demoHistory.ts`: 30 days of generated stock history per item, built backwards from current stock. The generator is seeded from each SKU, so results are the same on every run.
- `src/data/demoHistory.ts` also holds a small set of stock-out incidents.

Legacy demo surfaces identify themselves as synthetic. The seven primary
research routes identify the source as historical Sierra Leone data and do not
show the legacy demo banner. Do not load real patient or supplier data into
the demo adapter. That needs a backend, access controls and a privacy review.

## Inventory CSV import

The import dialog reads a CSV in the browser. Excel (`.xlsx`) is deferred to the backend.

Rules, all in `src/lib/inventorySchema.ts` and `src/lib/validators.ts`:

- **Required columns:** `sku`, `name`, `category`, `location`, `unit`, `current_stock`, `average_daily_usage`, `minimum_stock`, `supplier_name`, `lead_time_days`, `unit_cost`, `criticality`, `last_count_date`.
- **Optional columns:** `safety_stock`, `expected_delivery_date`, `incoming_quantity`, `services_affected`, `alternative_supplier_available`, `stock_held_elsewhere`.
- Header matching ignores case, spaces and underscores, so `Current Stock` matches `current_stock`.
- Numbers must be plain numbers (commas as thousands separators are allowed). Scientific notation is rejected.
- Dates must be real calendar dates in `YYYY-MM-DD`.
- Criticality must be `critical`, `high`, `medium` or `low`.
- Incoming quantity above zero needs an expected delivery date.
- Duplicate SKUs are rejected, both within the file and against existing items.
- Nothing is reported as imported until every row passes. Invalid rows are listed with line numbers and messages.
- The same validation runs in the add/edit form, so both paths accept and reject the same data.
- The file size limit is 2 MB.
- The import dialog offers two downloads: an empty template with the headers, and a sample file of the synthetic demo items (`navetra-sample-inventory-synthetic.csv`). The sample is generated from the same code as the export, so it always matches the current format.
- The top bar's "Import CSV" link opens the import dialog directly (`/inventory?import=1`).

The export (`buildInventoryCsv`) uses the same headers, so an exported file can be re-imported. A test checks this round trip for the demo data.

## Persistence

| Data | Where it is kept | Survives a page reload? |
| --- | --- | --- |
| Settings (thresholds, policy, locations, notifications, display) | `localStorage`, key `navetra.settings.v1` | Yes |
| Sidebar collapsed state | `localStorage`, key `navetra.sidebarCollapsed` | Yes |
| Inventory edits, imports and deletions | Memory in the browser | No (restored to demo data) |
| Notifications read/dismissed, activity log, saved scenarios | Memory in the browser | No |

Settings reset to defaults from the Settings page. The demo inventory is restored from the same page.

## Service boundary

Pages and components never call `fetch` directly. Services in `src/services/` decide where data comes from:

- `VITE_API_BASE_URL` controls the legacy browser inventory adapter and is not used by the seven primary research routes.
- `VITE_RESEARCH_API_BASE_URL` controls `researchService.ts`, the only service used by those seven routes. It is required; disconnected/error states are shown instead of synthetic fallback data.

## Planned API contract

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/inventory/items` | `InventoryItem[]` |
| POST | `/inventory/items` | `InventoryItem` (created) |
| PUT | `/inventory/items/{id}` | `InventoryItem` (updated) |
| DELETE | `/inventory/items?ids=...` | `{ deleted: number }` |
| POST | `/inventory/import` | `{ added: number }`, validated server-side |
| GET | `/inventory/deliveries` | `DeliveryRecord[]` |
| GET | `/inventory/incidents` | `StockOutIncident[]` |

Types are in `src/types/`. A server must apply the same validation rules as `src/lib/validators.ts`, and must reject duplicate SKUs and invalid rows before writing anything.

Open questions for the backend: authentication and roles, audit logging for stock changes, multi-site data ownership, and how real as-of dates are supplied.

## Historical research API

The FastAPI prototype reads `data/processed/S2_Dhis2Data.csv`, which contains historical Sierra Leone health-facility records from October 2019 through November 2023. It is not a live Indian inventory feed.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/research/summary` | Dataset coverage, recorded stockout rate and balance checks |
| GET | `/research/facilities` | Paginated facility-level aggregates |
| GET | `/research/products` | Paginated product-level aggregates |
| GET | `/research/history` | One facility-product history |
| GET | `/research/forecast` | Rule-based projection after six consecutive calendar months |
| GET | `/research/backtest` | Bounded one-month-ahead baseline evaluation |
| GET | `/research/ml-forecast` | Leakage-safe next-month model estimate |

The backtest target is the dataset's `stockout` column equal to `1`. The January-November 2023 default final test window uses only the six preceding calendar months for each prediction. It does not tune a threshold or train a machine-learning model.

## Machine-learning pipeline

`backend/ml_pipeline.py` builds lagged and rolling features grouped by
`hf_pk` and `productID`. A row is eligible only when the six preceding records
are six consecutive calendar months. Features include prior consumption,
receipts, opening and closing balances, prior stockout flags, rolling
consumption and balance summaries, calendar month sine/cosine values, and the
facility, district and product identifiers. The source `normAvg` and `normStd`
fields are also excluded because their historical availability timing is not
established. The inconsistent source `quarter` column is excluded.

`backend/train_model.py` trains a
`HistGradientBoostingClassifier` using chronological partitions:

- Training: April 2020–December 2021, 45,078 rows
- Validation: January–December 2022, 8,638 rows
- Final test: January–November 2023, 27,557 rows

The threshold is selected by validation F1 and frozen before final testing.
Running the command writes `backend/artifacts/stockout_model.joblib` and
`backend/artifacts/stockout_model.json`; these generated artifacts are ignored
by Git and must be provisioned by running the training command during deployment.

## Clean deployment provisioning

The CSV and generated model artifacts are intentionally not assumed to be
present in a clean deployment checkout. Provisioning must acquire the approved
`S2_Dhis2Data.csv` through the project's data-delivery mechanism, verify its
checksum if one is supplied, install `backend/requirements.txt`, and run
`backend\.venv\Scripts\python.exe -m backend.train_model` (or restore matching
artifacts from a trusted artifact store). The API should not be advertised as
ready until `/health` reports `ready: true`.

Set `VITE_RESEARCH_API_BASE_URL` to the deployed API origin when building the
frontend. Keep this separate from `VITE_API_BASE_URL`; the latter belongs only
to the legacy synthetic browser adapter. Configure production CORS origins with
the backend's comma-separated `NAVETRA_CORS_ORIGINS` environment variable
before exposing the API outside local development. Origins must be explicit;
wildcard origins are rejected. No public deployment is claimed by this
repository.

The model-backed endpoint is `GET /research/ml-forecast?facility_id=...&product_id=...`.
It predicts the next calendar month from the latest six consecutive observations
and returns the model version, threshold, score, and last observed date. A
missing or invalid artifact returns an explicit service error; it never falls
back to invented predictions.

`GET /health` reports process status separately from readiness. `ready` is true
only when both the dataset exists and the model artifact loads successfully;
otherwise the response is `degraded` with the model error when available.
