import type { RiskThresholdSettings } from "../../types/app";
import type { InventoryItem } from "../../types/inventory";
import { getInventoryMetrics, getRiskGroup } from "../../lib/inventoryMetrics";

interface CategoryRiskChartProps {
  items: readonly InventoryItem[];
  asOfDate: Date;
  thresholds: RiskThresholdSettings;
  onSelectCategory?: (category: string) => void;
}

export function CategoryRiskChart({ items, asOfDate, thresholds, onSelectCategory }: CategoryRiskChartProps) {
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const data = categories.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);
    const counts = { critical: 0, warning: 0, safe: 0 };
    categoryItems.forEach((item) => {
      const metrics = getInventoryMetrics(item, asOfDate, thresholds);
      counts[getRiskGroup(metrics.riskLevel)] += 1;
    });
    return { category, count: categoryItems.length, ...counts };
  });
  const maximum = Math.max(1, ...data.map((entry) => entry.count));

  return (
    <div className="category-bar-list" aria-label="Risk distribution by category">
      {data.map((entry) => (
        <button
          className="category-bar-row"
          key={entry.category}
          type="button"
          onClick={() => onSelectCategory?.(entry.category)}
          aria-label={`${entry.category}: ${entry.critical} critical, ${entry.warning} warning, ${entry.safe} safe. ${onSelectCategory ? "Open this category in inventory." : ""}`}
          disabled={!onSelectCategory}
        >
          <span className="category-bar-row__label" title={entry.category}>{entry.category}</span>
          <span className="category-bar-track" aria-hidden="true">
            <span style={{ width: `${(entry.critical / maximum) * 100}%`, background: "var(--color-chart-critical)" }} />
            <span style={{ width: `${(entry.warning / maximum) * 100}%`, background: "var(--color-chart-warning)" }} />
            <span style={{ width: `${(entry.safe / maximum) * 100}%`, background: "var(--color-chart-safe)" }} />
          </span>
          <strong>{entry.count}</strong>
        </button>
      ))}
    </div>
  );
}
