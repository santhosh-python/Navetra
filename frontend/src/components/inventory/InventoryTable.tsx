import { ArrowUpRight, Edit3 } from "lucide-react";
import { Link } from "react-router-dom";
import { DEMO_AS_OF_DATE } from "../../data/demoInventory";
import { formatDate, formatNumber } from "../../lib/formatters";
import { getInventoryMetrics, getRiskLabel } from "../../lib/inventoryMetrics";
import type { RiskThresholdSettings } from "../../types/app";
import type { InventoryItem } from "../../types/inventory";
import { StatusBadge } from "../common/StatusBadge";

interface InventoryTableProps {
  items: readonly InventoryItem[];
  selectedIds: readonly string[];
  onToggleItem: (id: string) => void;
  onTogglePage: (checked: boolean) => void;
  onEdit: (item: InventoryItem) => void;
  thresholds: RiskThresholdSettings;
  compact: boolean;
}

export function InventoryTable({ items, selectedIds, onToggleItem, onTogglePage, onEdit, thresholds, compact }: InventoryTableProps) {
  const allVisibleSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const rowClass = compact ? "inventory-table inventory-table--compact" : "inventory-table";

  return (
    <div className="table-scroll">
      <table className={rowClass}>
        <thead>
          <tr>
            <th className="table-select-cell"><input className="table-checkbox" type="checkbox" checked={allVisibleSelected} onChange={(event) => onTogglePage(event.target.checked)} aria-label="Select all visible inventory items" /></th>
            <th>Item and SKU</th>
            <th>Category</th>
            <th>Location</th>
            <th>Criticality</th>
            <th className="numeric-cell">Available stock</th>
            <th className="numeric-cell">Daily use</th>
            <th className="numeric-cell">Est. cover</th>
            <th className="numeric-cell">Minimum</th>
            <th>Expected delivery</th>
            <th>Risk status</th>
            <th aria-label="Row actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const metrics = getInventoryMetrics(item, DEMO_AS_OF_DATE, thresholds);
            return (
              <tr key={item.id}>
                <td className="table-select-cell"><input className="table-checkbox" type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggleItem(item.id)} aria-label={`Select ${item.name}`} /></td>
                <td>
                  <div className="inventory-table__item"><Link to={`/items/${item.id}`}>{item.name}</Link><span>{item.sku}</span></div>
                </td>
                <td>{item.category}</td>
                <td>{item.location}</td>
                <td><StatusBadge tone={item.criticality}>{item.criticality[0]!.toUpperCase() + item.criticality.slice(1)}</StatusBadge></td>
                <td className="numeric-cell"><span className="inventory-table__stock">{formatNumber(item.currentStock)} <span className="table-unit">{item.unit}</span></span></td>
                <td className="numeric-cell">{formatNumber(item.averageDailyUsage)} <span className="table-unit">/{item.unit}/day</span></td>
                <td className="numeric-cell"><span className="inventory-table__stock">{metrics.daysOfStock === null ? "—" : formatNumber(metrics.daysOfStock)}</span><span className="table-unit"> days</span></td>
                <td className="numeric-cell">{formatNumber(item.minimumStock)} <span className="table-unit">{item.unit}</span></td>
                <td><span className="delivery-date-cell">{formatDate(metrics.expectedDeliveryDate)}{metrics.expectedDeliveryDateIsEstimated ? <small>Est. from lead time</small> : null}</span></td>
                <td><span className="risk-label"><span className={`risk-dot risk-dot--${metrics.riskLevel}`} />{getRiskLabel(metrics.riskLevel)}</span></td>
                <td>
                  <div className="inventory-table__actions">
                    <Link className="icon-button icon-button--small" to={`/items/${item.id}`} aria-label={`View ${item.name}`} title="View item"><ArrowUpRight size={15} /></Link>
                    <button className="icon-button icon-button--small" type="button" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`} title="Edit item"><Edit3 size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
