import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RiskThresholdSettings } from "../../types/app";
import type { InventoryItem } from "../../types/inventory";
import { getInventoryMetrics, getRiskGroup } from "../../lib/inventoryMetrics";

export type RiskDistributionKey = "critical" | "warning" | "safe";

interface RiskDistributionChartProps {
  items: readonly InventoryItem[];
  asOfDate: Date;
  thresholds: RiskThresholdSettings;
  onSelectRisk: (risk: RiskDistributionKey) => void;
}

const groups: { key: RiskDistributionKey; name: string; color: string }[] = [
  { key: "critical", name: "Critical", color: "var(--color-chart-critical)" },
  { key: "warning", name: "Warning", color: "var(--color-chart-warning)" },
  { key: "safe", name: "Safe", color: "var(--color-chart-safe)" },
];

export function RiskDistributionChart({ items, asOfDate, thresholds, onSelectRisk }: RiskDistributionChartProps) {
  const counts: Record<RiskDistributionKey, number> = { critical: 0, warning: 0, safe: 0 };
  items.forEach((item) => {
    const metrics = getInventoryMetrics(item, asOfDate, thresholds);
    counts[getRiskGroup(metrics.riskLevel)] += 1;
  });
  const data = groups.map((group) => ({ ...group, value: counts[group.key] }));

  return (
    <div className="donut-layout">
      <div className="donut-chart-wrap" aria-label={`Risk distribution across ${items.length} items`} role="img">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="67%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
              onClick={(_, index) => {
                const group = data[index]?.key;
                if (group) onSelectRisk(group);
              }}
            >
              {data.map((entry) => <Cell key={entry.key} fill={entry.color} cursor="pointer" />)}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value ?? 0} items`, "Count"]}
              contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center"><strong>{items.length}</strong><span>items</span></div>
      </div>
      <div className="donut-legend" aria-label="Filter by risk group">
        {data.map((group) => (
          <button key={group.key} type="button" onClick={() => onSelectRisk(group.key)} aria-label={`Show ${group.value} ${group.name.toLowerCase()} items`}>
            <span className="donut-legend__dot" style={{ background: group.color }} />
            <span>{group.name}</span>
            <strong>{group.value}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
