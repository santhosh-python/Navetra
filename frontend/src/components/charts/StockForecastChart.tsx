import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DEMO_AS_OF_DATE } from "../../data/demoInventory";
import { demoHistory } from "../../data/demoHistory";
import { formatDate, formatNumber } from "../../lib/formatters";
import { addCalendarDays, calendarDaysBetween, parseDateOnly, toDateOnly } from "../../lib/inventoryMetrics";
import type { InventoryItem } from "../../types/inventory";

interface StockForecastChartProps {
  item: InventoryItem;
  horizonDays: number;
  historicalDays?: number;
  showConsumption?: boolean;
  compact?: boolean;
}

interface ChartPoint {
  date: string;
  actualStock: number | null;
  projectedStock: number | null;
  consumption: number | null;
}

export function StockForecastChart({
  item,
  horizonDays,
  historicalDays = 14,
  showConsumption = false,
  compact = false,
}: StockForecastChartProps) {
  const hasSyntheticHistory = demoHistory.some((observation) => observation.inventoryItemId === item.id);
  const data = useMemo(() => {
    const history = demoHistory
      .filter((observation) => observation.inventoryItemId === item.id)
      .slice(-historicalDays)
      .map((observation): ChartPoint => ({
        date: observation.date,
        actualStock: observation.closingStock,
        projectedStock: null,
        consumption: showConsumption ? observation.consumption : null,
      }));

    const currentDate = toDateOnly(DEMO_AS_OF_DATE);
    history.push({ date: currentDate, actualStock: item.currentStock, projectedStock: item.currentStock, consumption: showConsumption ? item.averageDailyUsage : null });
    const recordedDeliveryDate = item.expectedDeliveryDate ? parseDateOnly(item.expectedDeliveryDate) : null;
    const deliveryDate = recordedDeliveryDate ?? addCalendarDays(DEMO_AS_OF_DATE, item.leadTimeDays);
    const deliveryDay = Math.max(0, calendarDaysBetween(DEMO_AS_OF_DATE, deliveryDate));
    let projectedStock = item.currentStock;

    if (deliveryDay === 0) projectedStock += item.incomingQuantity;
    for (let day = 1; day <= horizonDays; day += 1) {
      projectedStock = Math.max(0, projectedStock - item.averageDailyUsage);
      if (day === deliveryDay) projectedStock += item.incomingQuantity;
      history.push({
        date: toDateOnly(addCalendarDays(DEMO_AS_OF_DATE, day)),
        actualStock: null,
        projectedStock: Math.round(projectedStock * 10) / 10,
        consumption: null,
      });
    }
    return history;
  }, [historicalDays, horizonDays, item, showConsumption]);

  const recordedDeliveryDate = item.expectedDeliveryDate ? parseDateOnly(item.expectedDeliveryDate) : null;
  const deliveryDate = toDateOnly(recordedDeliveryDate ?? addCalendarDays(DEMO_AS_OF_DATE, item.leadTimeDays));
  const deliveryDay = Math.max(0, calendarDaysBetween(DEMO_AS_OF_DATE, recordedDeliveryDate ?? addCalendarDays(DEMO_AS_OF_DATE, item.leadTimeDays)));
  const stockOutDay = item.averageDailyUsage > 0 ? Math.ceil(item.currentStock / item.averageDailyUsage) : null;
  const potentialGapDate = stockOutDay !== null && stockOutDay < deliveryDay
    ? toDateOnly(addCalendarDays(DEMO_AS_OF_DATE, stockOutDay))
    : null;
  const dateInRange = (date: string | null) => date !== null && data.some((point) => point.date === date);

  return (
    <div className={`chart-container${compact ? " chart-container--short" : " chart-container--tall"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 11, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--color-chart-grid)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatDate(value).replace(/, \d{4}/, "")} tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis yAxisId="stock" tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} width={43} domain={[0, "auto"]} />
          {showConsumption ? <YAxis yAxisId="usage" orientation="right" tick={{ fill: "#87909a", fontSize: 10 }} tickLine={false} axisLine={false} width={36} /> : null}
          <Tooltip
            labelFormatter={(value) => formatDate(String(value))}
            formatter={(value, name) => {
              if (value === null || value === undefined) return ["—", String(name)];
              const label = name === "actualStock" ? (hasSyntheticHistory ? "Observed stock · synthetic" : "Current stock snapshot") : name === "projectedStock" ? "Projected stock · estimate" : "Daily usage · synthetic";
              const unitValue = name === "consumption" ? `${formatNumber(Number(value))} ${item.unit}/day` : `${formatNumber(Number(value))} ${item.unit}`;
              return [unitValue, label];
            }}
            contentStyle={{ border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }}
          />
          <ReferenceLine yAxisId="stock" y={item.minimumStock} stroke="var(--color-chart-warning)" strokeDasharray="4 4" label={{ value: "Minimum", fill: "var(--color-text-muted)", fontSize: 10, position: "insideTopRight" }} />
          {dateInRange(deliveryDate) ? <ReferenceLine x={deliveryDate} stroke="var(--color-chart-2)" strokeDasharray="3 3" label={{ value: "Delivery", fill: "var(--color-chart-2)", fontSize: 10, position: "insideTopLeft" }} /> : null}
          {dateInRange(potentialGapDate) ? <ReferenceLine x={potentialGapDate!} stroke="var(--color-chart-critical)" strokeDasharray="3 3" label={{ value: "Potential gap", fill: "var(--color-chart-critical)", fontSize: 10, position: "insideTopRight" }} /> : null}
          <Area yAxisId="stock" type="monotone" dataKey="projectedStock" name="projectedStock" stroke="var(--color-chart-2)" fill="var(--color-chart-2)" fillOpacity={0.08} strokeWidth={2.2} strokeDasharray="6 4" connectNulls />
          <Line yAxisId="stock" type="monotone" dataKey="actualStock" name="actualStock" stroke="var(--color-chart-1)" strokeWidth={2.2} dot={false} connectNulls />
          {showConsumption ? <Line yAxisId="usage" type="monotone" dataKey="consumption" name="consumption" stroke="var(--color-chart-3)" strokeWidth={1.7} dot={false} connectNulls /> : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
