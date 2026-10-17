# Calculations and rules

Every number in Navetra comes from the pure functions in `src/lib/`. This page states what each one assumes and what it does not mean. All figures use synthetic demo data.

**Labelling:** shortage dates, the projection and the scenario results are *rule-based estimates*. They apply simple arithmetic to the recorded stock, usage and delivery dates. They are not machine-learning predictions, and they are not confidence intervals. The priority score is a published points system, not a statistical model.

## Dates and stock timing

- Dates are `YYYY-MM-DD` strings. Arithmetic is UTC (`src/lib/dates.ts`).
- The app uses a fixed as-of date for the demo: **2026-10-17**. A real backend would supply this.
- Stock is measured at the start of the day.

| Quantity | Formula | Code |
| --- | --- | --- |
| Days of stock | `currentStock ÷ averageDailyUsage` (null if usage is 0) | `calculateDaysOfStock` |
| Stock-out date | `asOfDate + floor(days of stock)` | `calculateStockOutDate` |
| Replenishment date | scheduled `expectedDeliveryDate`, otherwise `asOfDate + leadTimeDays` | `calculateReplenishmentDate` |
| Shortage gap (days) | `max(0, replenishment − stock-out)` | `calculateShortageGapDays` |
| Demand during lead time | `averageDailyUsage × leadTimeDays` | `calculateDemandDuringLeadTime` |

**Stock-out date means "runs out at current use, without new deliveries".** It is not a promise that stock will run out on that day, and the UI labels it that way.

## Reorder point and order quantity

| Quantity | Formula |
| --- | --- |
| Inventory position | `currentStock + incomingQuantity` |
| Reorder point | `averageDailyUsage × leadTimeDays + safetyStock` |
| Policy quantity | `0` if position ≥ reorder point; otherwise `(leadTimeDays + targetCoverDays) × averageDailyUsage + safetyStock − position` |
| Emergency quantity | `ceil(shortage + safetyStock)` when a gap exists |
| Suggested order | `max(policy quantity, emergency quantity)` |
| Order value | `suggested order × unitCost` (₹) |

The default target cover is 30 days (adjustable in Settings). A suggested order is a figure to review, not an order. Navetra does not place orders.

## Turnover

`calculateInventoryTurnover`: `averageDailyUsage × 365 ÷ currentStock`, rounded to two decimals. It is annualised and **indicative only**. It is blank when usage or stock is zero.

## Risk levels

Evaluated in this order (`src/lib/riskClassification.ts`):

1. **Critical**: the gap is above 0 (stock runs out before replenishment), or days of stock ≤ critical threshold (default **7**).
2. **Warning**: days of stock ≤ warning threshold (default **14**), or stock is below minimum stock.
3. **Safe**: otherwise.

Each level has a text label and a colour. The thresholds in Settings drive every count, chart, notification and priority score.

## Projection and the at-risk trend

- Day *k* of the projection is `asOfDate + k`. Opening stock on day *k* equals closing stock on day *k − 1*.
- Scheduled deliveries arrive on their expected date. An item with no delivery date is projected with **no arrival**.
- The chart marks the earliest point at which a new order placed today would arrive (lead time).
- The at-risk trend counts, for each day, the items whose days of stock are at or below the warning threshold. Thirty observed days come first, then the projection from today.

## Recommended actions

Only Warning and Critical items receive a recommendation. Rules are applied in order (`chooseRecommendedAction`):

1. **Transfer stock** from another location if `stockHeldElsewhere` covers the shortage.
2. **Confirm supplier dispatch** if a delivery is scheduled but a gap remains.
3. **Reorder now** if there is a gap, or the item is below its reorder point or minimum stock and a suggested order exists.
4. **Investigate unusually high consumption** if the recent usage ratio is at least **1.25**.
5. **Check stock records** if the last count is more than **30 days** old.
6. **Increase safety stock** if safety stock is below **3 days** of usage.
7. **Monitor the next delivery** otherwise.

The recommendation text is generated from the item's own numbers. "Recent usage ratio" is the average of the last 7 observed days divided by the 30-day average.

## Priority score (0–100)

This is a disclosed points system. Each factor has a published maximum, and the UI shows the breakdown. Source: `src/lib/priorityScoring.ts` (`PRIORITY_DISCLOSURE` lists the table shown in the app).

| Factor | Max | Rule |
| --- | --- | --- |
| Time until shortage | 40 | Gap > 0: 40. ≤ critical days: 32. ≤ warning days: 20. ≤ 30 days: 8. Otherwise 0. |
| Supplier lead time | 15 | ≥ 14 days: 15. ≥ 7: 10. ≥ 3: 5. Otherwise 2. |
| Criticality | 25 | Critical 25, High 18, Medium 10, Low 4. |
| Services affected | 10 | One point per 40 patients or services, capped at 10. |
| No alternative | 10 | 10 unless an alternative supplier is available or stock is held elsewhere. |

Ties are broken by earliest stock-out, then by name. These weights are a product decision, not evidence of predictive accuracy. Change them in `priorityScoring.ts` and the disclosure table will reflect the change.

## What-if simulator

- Effective daily usage = `usage × (1 + demand change) × (1 − reduction)`.
- A delivery delay moves the replenishment date later.
- A transfer from another location arrives on day 1 and adds to stock on hand.
- An extra order arrives on the chosen day (capped at the horizon).
- Risk direction is shown against the baseline. The Emergency preset stays Critical because days of stock on hand are at or below 7.
- The baseline matches the Inventory page. Results are estimates of what the model would show, not operational outcomes.

## Analytics and report notes

- Criticality scatter: criticality mapped to 1–4, days of stock capped at 30, and a deterministic offset so identical points stay visible.
- Report CSV exports use raw values. On-screen and printed reports show formatted text.
- Reports are limited by location and category before the report is built. Recommendations are limited to the same items.

## Known limits

- Usage is assumed constant at the average rate within each projection. Real demand varies, and the demo history varies by about ±20% day to day.
- The model ignores partial deliveries, shelf life, batch expiry and multi-location transfers beyond a single "held elsewhere" quantity.
- No statistical validation has been carried out. Treat outputs as planning prompts, not forecasts.
