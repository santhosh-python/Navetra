# Data, import, persistence and the planned API

## Synthetic demo data

Everything the app shows by default is synthetic:

- `src/data/demoInventory.ts`: 18 items across medicines, laboratory supplies, emergency supplies, food and cleaning, with suppliers and locations invented for the demo.
- `src/data/demoDeliveries.ts`: scheduled and received deliveries.
- `src/data/demoHistory.ts`: 30 days of generated stock history per item, built backwards from current stock. The generator is seeded from each SKU, so results are the same on every run.
- `src/data/demoHistory.ts` also holds a small set of stock-out incidents.

The sidebar footer always states that the data is synthetic demo data. A larger banner repeats this on each page and can be hidden (Settings turns it back on). Pages that show figures also say so in their subtitles. Do not load real patient or supplier data into this demo. That needs a backend, access controls and a privacy review first.

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

- `VITE_API_BASE_URL` empty (default): the services use the in-browser demo adapter. A 350 ms delay simulates a request. The UI shows "Demo data, backend not connected".
- `VITE_API_BASE_URL` set: the services call the endpoints below. **These endpoints are not implemented. Setting the variable today will produce request errors.** This is a documented contract, not a working integration.

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
