import { ArrowUpRight, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import type { RiskThresholdSettings } from "../../types/app";
import type { InventoryItem } from "../../types/inventory";
import { formatDate, formatNumber } from "../../lib/formatters";
import { getInventoryMetrics } from "../../lib/inventoryMetrics";
import { StatusBadge } from "../common/StatusBadge";

interface StockOutTimelineProps {
  items: readonly InventoryItem[];
  asOfDate: Date;
  thresholds: RiskThresholdSettings;
  horizonDays: number;
  limit?: number;
}

export function StockOutTimeline({ items, asOfDate, thresholds, horizonDays, limit = 5 }: StockOutTimelineProps) {
  const rows = items
    .map((item) => ({ item, metrics: getInventoryMetrics(item, asOfDate, thresholds) }))
    .sort((left, right) => {
      if (left.metrics.shortageGapDays !== right.metrics.shortageGapDays) {
        return right.metrics.shortageGapDays - left.metrics.shortageGapDays;
      }
      return (left.metrics.daysOfStock ?? Number.POSITIVE_INFINITY) - (right.metrics.daysOfStock ?? Number.POSITIVE_INFINITY);
    })
    .slice(0, limit);

  if (!rows.length) {
    return <div className="chart-empty">No inventory records are available for this organization.</div>;
  }

  return (
    <>
      <div className="timeline-list">
        {rows.map(({ item, metrics }) => {
          const stockoutPosition = Math.min(100, Math.max(0, ((metrics.daysOfStock ?? horizonDays) / horizonDays) * 100));
          const deliveryPosition = Math.min(100, Math.max(0, (metrics.daysUntilDelivery / horizonDays) * 100));
          const gapStart = Math.min(stockoutPosition, deliveryPosition);
          const gapWidth = Math.max(0, Math.abs(deliveryPosition - stockoutPosition));
          const deliveryOverHorizon = metrics.daysUntilDelivery > horizonDays;
          const label = metrics.daysOfStock === null ? "No usage rate" : `${formatNumber(metrics.daysOfStock)} days`;
          const timelineDescription = `${item.name}: stock coverage ${label}; expected delivery ${formatDate(metrics.expectedDeliveryDate)}${metrics.shortageGapDays ? `; ${metrics.shortageGapDays} day projected gap` : ""}`;
          return (
            <div className="timeline-item-row" key={item.id}>
              <Link className="timeline-item__label" to={`/items/${item.id}`} title={`${item.name} · ${item.sku}`}>
                <strong>{item.name}</strong>
                <span>{item.location}</span>
              </Link>
              <div className="timeline-track" role="img" aria-label={timelineDescription} title={timelineDescription}>
                {metrics.shortageGapDays > 0 ? <span className="timeline-track__gap" style={{ left: `${gapStart}%`, width: `${gapWidth}%` }} /> : null}
                <span className={`timeline-track__coverage timeline-track__coverage--${metrics.riskLevel}`} style={{ width: `${stockoutPosition}%` }} />
                <span className={`timeline-track__delivery${deliveryOverHorizon ? " timeline-track__delivery--beyond" : ""}`} style={{ left: `${deliveryPosition}%` }} />
              </div>
              <div className="timeline-item__meta">
                <span className="timeline-item__dates">{metrics.shortageGapDays > 0 ? `${metrics.shortageGapDays}d gap` : `Delivery ${formatDate(metrics.expectedDeliveryDate)}`}</span>
                {metrics.shortageGapDays > 0 ? <StatusBadge tone="critical">Gap</StatusBadge> : <span className="timeline-item__delivery-mark"><Truck size={13} aria-hidden="true" /></span>}
                <ArrowUpRight className="timeline-item__open" size={14} aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="timeline-axis"><span>Today</span><span>+{Math.round(horizonDays / 3)}d</span><span>+{Math.round((2 * horizonDays) / 3)}d</span><span>+{horizonDays}d</span></div>
      <div className="timeline-key"><span><i />Stock coverage</span><span><i className="timeline-key__gap" />Projected gap</span><span><i className="timeline-key__delivery" />Expected delivery</span></div>
    </>
  );
}
