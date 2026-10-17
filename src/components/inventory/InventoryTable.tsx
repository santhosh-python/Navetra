import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-react';
import type { InventoryRow, InventorySortKey, SortDirection } from '../../lib/inventoryQuery';
import { formatDailyRate, formatDecimal, formatQuantity, formatWholeDaysRemaining } from '../../lib/formatters';
import { formatShortDate } from '../../lib/dates';
import { RiskBadge } from '../common/StatusBadge';
import { Button } from '../common/Button';

interface InventoryTableProps {
  rows: InventoryRow[];
  selectedIds: Set<string>;
  onToggleRow: (itemId: string) => void;
  onToggleAll: (itemIds: string[], select: boolean) => void;
  sortKey: InventorySortKey;
  sortDirection: SortDirection;
  onSort: (key: InventorySortKey) => void;
  onEdit: (itemId: string) => void;
}

const SORTABLE_COLUMNS: { key: InventorySortKey; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Item' },
  { key: 'urgency', label: 'Risk' },
  { key: 'stock', label: 'Stock on hand', numeric: true },
  { key: 'consumption', label: 'Daily use', numeric: true },
  { key: 'stockOutDate', label: 'Stock-out at current use' },
];

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown size={13} aria-hidden="true" />;
  return direction === 'asc' ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />;
}

/** Inventory list. Sorting, selection and paging are controlled by the page; this component only draws them. */
export function InventoryTable({ rows, selectedIds, onToggleRow, onToggleAll, sortKey, sortDirection, onSort, onEdit }: InventoryTableProps) {
  const pageIds = rows.map((row) => row.item.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = pageIds.some((id) => selectedIds.has(id)) && !allSelected;

  return (
    <div className="table-wrap" style={{ borderRadius: 0, border: 0 }}>
      <table className="table">
        <caption className="visually-hidden">Inventory items. Use the column headers to sort.</caption>
        <thead>
          <tr>
            <th scope="col" style={{ width: 40 }}>
              <input
                type="checkbox"
                className="table__select"
                aria-label="Select all items on this page"
                checked={allSelected}
                ref={(element) => {
                  if (element) element.indeterminate = someSelected;
                }}
                onChange={(event) => onToggleAll(pageIds, event.target.checked)}
              />
            </th>
            {SORTABLE_COLUMNS.map((column) => {
              const active = sortKey === column.key;
              return (
                <th key={column.key} scope="col" className={column.numeric ? 'num' : undefined} aria-sort={active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="table__sort" onClick={() => onSort(column.key)}>
                    {column.label}
                    <SortIcon active={active} direction={sortDirection} />
                  </button>
                </th>
              );
            })}
            <th scope="col">Suggested order</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={9} className="table__empty">
                No items match these filters.
              </td>
            </tr>
          )}
          {rows.map(({ item, analysis }) => {
            const selected = selectedIds.has(item.id);
            return (
              <tr key={item.id} className={selected ? 'is-selected' : undefined}>
                <td>
                  <input type="checkbox" className="table__select" aria-label={`Select ${item.name}`} checked={selected} onChange={() => onToggleRow(item.id)} />
                </td>
                <td>
                  <div className="table__cell-stack">
                    <Link to={`/inventory/${encodeURIComponent(item.id)}`} className="table__primary" style={{ textDecoration: 'none' }}>
                      {item.name}
                    </Link>
                    <span className="table__secondary">
                      {item.sku} · {item.location}
                    </span>
                  </div>
                </td>
                <td>
                  <RiskBadge risk={analysis.risk} />
                </td>
                <td className="num">
                  <div className="table__cell-stack table__cell-stack--right">
                    <span>{formatQuantity(item.currentStock, item.unit)}</span>
                    <span className="table__secondary">min {formatDecimal(item.minimumStock)}</span>
                  </div>
                </td>
                <td className="num">
                  <div className="table__cell-stack table__cell-stack--right">
                    <span>{formatDailyRate(item.averageDailyUsage, item.unit)}</span>
                    <span className="table__secondary">{analysis.daysOfStock === null ? 'No usage' : `${formatWholeDaysRemaining(analysis.daysOfStock)} of stock`}</span>
                  </div>
                </td>
                <td>
                  <div className="table__cell-stack">
                    <span>{analysis.stockOutDate ? formatShortDate(analysis.stockOutDate) : '—'}</span>
                    {analysis.gapDays > 0 ? (
                      <span className="table__secondary text-critical">{analysis.gapDays}-day gap before delivery</span>
                    ) : (
                      <span className="table__secondary">Covered until replenishment</span>
                    )}
                  </div>
                </td>
                <td className="num">
                  {analysis.suggestedOrderQuantity > 0 ? formatQuantity(analysis.suggestedOrderQuantity, item.unit) : <span className="text-subtle">None needed</span>}
                </td>
                <td>
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Edit ${item.name}`} onClick={() => onEdit(item.id)} icon={<Pencil size={15} aria-hidden="true" />} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
