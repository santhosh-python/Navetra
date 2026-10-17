import { useMemo, useState } from 'react';
import { Download, Plus, Upload, X } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { SearchInput } from '../components/common/SearchInput';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { Pagination } from '../components/common/Pagination';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { LoadingState, EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { InventoryTable } from '../components/inventory/InventoryTable';
import { InventoryFormDialog } from '../components/inventory/InventoryFormDialog';
import { ImportDialog } from '../components/inventory/ImportDialog';
import { useInventory } from '../hooks/useInventory';
import { useActivity } from '../hooks/useActivity';
import { useNotifications } from '../hooks/useNotifications';
import {
  DEFAULT_INVENTORY_QUERY,
  filterInventoryRows,
  sortInventoryRows,
  type InventoryQuery,
  type InventorySortKey,
} from '../lib/inventoryQuery';
import { buildInventoryCsv } from '../lib/inventoryExport';
import { stringifyCsv, downloadTextFile } from '../lib/csv';
import type { InventoryItem, RiskLevel } from '../types/inventory';

const RISK_OPTIONS: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'safe', label: 'Safe' },
];

/** Default sort direction when a column is first chosen. */
const FIRST_DIRECTION: Record<InventorySortKey, 'asc' | 'desc'> = {
  urgency: 'asc',
  name: 'asc',
  stock: 'asc',
  consumption: 'desc',
  stockOutDate: 'asc',
};

export function InventoryPage() {
  const { rows, items, status, errorMessage, locations, categories, suppliers, deleteItems, asOfDate } = useInventory();
  const { setReviewed } = useActivity();
  const { showToast } = useNotifications();

  const [query, setQuery] = useState<InventoryQuery>(DEFAULT_INVENTORY_QUERY);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const updateQuery = (patch: Partial<InventoryQuery>) => {
    setQuery((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const filtered = useMemo(() => filterInventoryRows(rows, query), [rows, query]);
  const sorted = useMemo(() => sortInventoryRows(filtered, query.sortKey, query.sortDirection), [filtered, query.sortKey, query.sortDirection]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasActiveFilters = query.search !== '' || query.category !== 'all' || query.location !== 'all' || query.supplier !== 'all' || query.risk !== 'all';
  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  const toggleRow = (itemId: string) => {
    setConfirmingDelete(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = (itemIds: string[], select: boolean) => {
    setConfirmingDelete(false);
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of itemIds) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const sortBy = (key: InventorySortKey) => {
    if (query.sortKey === key) {
      updateQuery({ sortDirection: query.sortDirection === 'asc' ? 'desc' : 'asc' });
    } else {
      updateQuery({ sortKey: key, sortDirection: FIRST_DIRECTION[key] });
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEdit = (itemId: string) => {
    const item = items.find((candidate) => candidate.id === itemId) ?? null;
    setEditingItem(item);
    setFormOpen(true);
  };

  const exportCsv = (rowItems: InventoryItem[], fileName: string) => {
    const csv = buildInventoryCsv(rowItems);
    downloadTextFile(fileName, stringifyCsv(csv.headers, csv.rows));
    showToast(`Exported ${rowItems.length} ${rowItems.length === 1 ? 'item' : 'items'} to CSV.`);
  };

  const markSelectedReviewed = () => {
    for (const item of selectedItems) setReviewed(item.id, true);
    showToast(`Marked ${selectedItems.length} ${selectedItems.length === 1 ? 'item' : 'items'} as reviewed in this session.`, 'info');
  };

  const confirmDelete = async () => {
    setActionError(null);
    try {
      const ids = [...selectedIds];
      const deleted = await deleteItems(ids);
      setSelectedIds(new Set());
      setConfirmingDelete(false);
      showToast(`Deleted ${deleted} ${deleted === 1 ? 'item' : 'items'} from this session. Demo data can be restored in Settings.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Deletion did not complete. Nothing was removed.');
    }
  };

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Inventory" subtitle="Loading items…" />
        <SectionCard>
          <LoadingState label="Loading inventory" />
        </SectionCard>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title="Inventory" />
        <Alert tone="error">{errorMessage ?? 'The inventory could not be loaded.'}</Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${items.length} items across ${locations.length} locations. Synthetic demo data, as of ${asOfDate}.`}
        actions={
          <>
            <Button icon={<Upload size={15} aria-hidden="true" />} onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button icon={<Download size={15} aria-hidden="true" />} onClick={() => exportCsv(sorted.map((row) => row.item), 'navetra-demo-inventory.csv')} disabled={sorted.length === 0}>
              Export CSV
            </Button>
            <Button variant="primary" icon={<Plus size={15} aria-hidden="true" />} onClick={openAdd}>
              Add item
            </Button>
          </>
        }
      />

      <SectionCard flush>
        <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
          <div className="page-toolbar" style={{ marginBottom: 0 }}>
            <div style={{ flex: '1 1 260px', maxWidth: 360 }}>
              <SearchInput id="inventory-search" label="Search items by name or SKU" value={query.search} onChange={(value) => updateQuery({ search: value })} />
            </div>
            <FormField id="filter-category" label="Category">
              <select id="filter-category" className="select" style={{ width: 190 }} value={query.category} onChange={(event) => updateQuery({ category: event.target.value })}>
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="filter-location" label="Location">
              <select id="filter-location" className="select" style={{ width: 170 }} value={query.location} onChange={(event) => updateQuery({ location: event.target.value })}>
                <option value="all">All locations</option>
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="filter-supplier" label="Supplier">
              <select id="filter-supplier" className="select" style={{ width: 180 }} value={query.supplier} onChange={(event) => updateQuery({ supplier: event.target.value })}>
                <option value="all">All suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="field">
              <span className="field__label" id="risk-filter-label">
                Risk
              </span>
              <SegmentedControl label="Filter by risk" options={RISK_OPTIONS} value={query.risk} onChange={(value) => updateQuery({ risk: value })} />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" icon={<X size={14} aria-hidden="true" />} onClick={() => updateQuery({ search: '', category: 'all', location: 'all', supplier: 'all', risk: 'all' })}>
                Clear filters
              </Button>
            )}
          </div>
          <p className="text-small text-muted" aria-live="polite" style={{ marginTop: 10 }}>
            Showing {sorted.length} of {rows.length} items
            {hasActiveFilters ? ' (filtered)' : ''}. Sorted by {query.sortKey === 'urgency' ? 'risk' : query.sortKey === 'stockOutDate' ? 'stock-out date' : query.sortKey === 'stock' ? 'stock on hand' : query.sortKey === 'consumption' ? 'daily use' : 'name'}.
          </p>
        </div>

        {selectedIds.size > 0 && (
          <div style={{ padding: '12px 20px 0' }}>
            <div className="bulk-bar" role="region" aria-label="Bulk actions">
              <strong>{selectedIds.size} selected</strong>
              <Button size="sm" onClick={markSelectedReviewed}>
                Mark reviewed
              </Button>
              <Button size="sm" onClick={() => exportCsv(selectedItems, 'navetra-demo-selected-items.csv')}>
                Export selected
              </Button>
              {!confirmingDelete ? (
                <Button size="sm" variant="danger" onClick={() => setConfirmingDelete(true)}>
                  Delete selected
                </Button>
              ) : (
                <span className="row row--wrap">
                  <span className="text-small">Remove {selectedIds.size} from this session?</span>
                  <Button size="sm" variant="danger" onClick={confirmDelete}>
                    Confirm delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                    Keep items
                  </Button>
                </span>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto' }}>
                Clear selection
              </Button>
            </div>
            {actionError && <Alert tone="error">{actionError}</Alert>}
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ padding: 20 }}>
            <EmptyState
              title="No items yet"
              description="Add an item by hand or import a CSV file. Nothing is saved outside this browser session."
              action={
                <div className="row">
                  <Button variant="primary" onClick={openAdd}>
                    Add item
                  </Button>
                  <Button onClick={() => setImportOpen(true)}>Import CSV</Button>
                </div>
              }
            />
          </div>
        ) : (
          <>
            <div style={{ padding: '0 0 0' }}>
              <InventoryTable
                rows={pageRows}
                selectedIds={selectedIds}
                onToggleRow={toggleRow}
                onToggleAll={toggleAll}
                sortKey={query.sortKey}
                sortDirection={query.sortDirection}
                onSort={sortBy}
                onEdit={openEdit}
              />
            </div>
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={sorted.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        )}
      </SectionCard>

      <InventoryFormDialog open={formOpen} onClose={() => setFormOpen(false)} item={editingItem} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
