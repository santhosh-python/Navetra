import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DEMO_AS_OF_DATE } from "../../data/demoInventory";
import { demoHistory } from "../../data/demoHistory";
import type { RiskThresholdSettings } from "../../types/app";
import type { InventoryItem } from "../../types/inventory";
import { classifyInventoryRisk } from "../../lib/calculations";
import { formatDate } from "../../lib/formatters";
import { addCalendarDays, toDateOnly } from "../../lib/inventoryMetrics";

interface RiskTrendChartProps {
  items: readonly InventoryItem[];
  rangeDays: number;
  thresholds: RiskThresholdSettings;
}

export function RiskTrendChart({ items, rangeDays, thresholds }: RiskTrendChartProps) {
  const data = useMemo(() => {
    const observationsByKey = new Map(
      demoHistory.map((observation) => [`${observation.inventoryItemId}:${observation.date}`, observation.closingStock]),
    );
    const historicalItems = items.filter((item) => observationsByKey.has(`${item.id}:${toDateOnly(addCalendarDays(DEMO_AS_OF_DATE, -1))}`));
    if (!historicalItems.length) return [];

    return Array.from({ length: rangeDays }, (_, index) => {
      const daysAgo = rangeDays - index - 1;
      const date = toDateOnly(addCalendarDays(DEMO_AS_OF_DATE, -daysAgo));
      let atRisk = 0;
      let critical = 0;
      historicalItems.forEach((item) => {
        const stock = daysAgo === 0
          ? item.currentStock
          : observationsByKey.get(`${item.id}:${date}`);
        if (stock === undefined) return;
        const risk = classifyInventoryRisk({ ...item, currentStock: stock }, thresholds);
        if (risk !== "low") atRisk += 1;
        if (risk === "critical") critical += 1;
      });
      return { date, atRisk, critical };
    });
  }, [items, rangeDays, thresholds]);

  if (!data.length) {
    return <div className="chart-empty">No historical stock series is available for the current imported or edited records. Risk trend is shown for synthetic demo items only.</div>;
  }

  return (
    <div className="chart-container chart-container--short">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 5, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatDate(value).replace(/, \d{4}/, "")} tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={26} />
          <YAxis allowDecimals={false} tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} width={34} />
          <Tooltip labelFormatter={(value) => formatDate(String(value))} formatter={(value, name) => [`${value ?? 0} items`, name === "critical" ? "Critical" : "At risk"]} contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
          <Line type="monotone" dataKey="atRisk" name="At risk" stroke="var(--color-chart-warning)" strokeWidth={2.2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="critical" name="Critical" stroke="var(--color-chart-critical)" strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-source-note">Synthetic historical series · risk rules applied to illustrative stock observations</p>
    </div>
  );
}
