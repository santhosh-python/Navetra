import { useEffect, useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Download, Filter, RefreshCw, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { InventoryFormModal } from "../components/inventory/InventoryFormModal";
import { InventoryTable } from "../components/inventory/InventoryTable";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { SearchInput } from "../components/common/SearchInput";
import { SelectFilter } from "../components/common/SelectFilter";
import { PageHeader } from "../components/layout/PageHeader";
import { DEMO_AS_OF_DATE } from "../data/demoInventory";
import { useAppState } from "../hooks/useAppState";
import { useToast } from "../hooks/useToast";
import { downloadTextFile, inventoryToCsv } from "../lib/csvExport";
import { selectInventory, type InventorySortKey, type RiskGroup } from "../lib/inventorySelectors";
import type { InventoryItem } from "../types/inventory";

const PAGE_SIZE = 10;
const riskOptions: RiskGroup[] = ["critical", "warning", "safe"];
export function InventoryPage() {
  const { items, settings, dataset, isLoading, error, refresh } = useAppState();
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");
  const [supplier, setSupplier] = useState(searchParams.get("supplier") ?? "");
  const [riskGroup, setRiskGroup] = useState<RiskGroup | "">((searchParams.get("riskGroup") as RiskGroup | null) ?? "");
  const [sortBy, setSortBy] = useState<InventorySortKey>("daysOfStock");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setCategory(searchParams.get("category") ?? "");
    setLocation(searchParams.get("location") ?? "");
    setSupplier(searchParams.get("supplier") ?? "");
    setRiskGroup((searchParams.get("riskGroup") as RiskGroup | null) ?? "");
    setPage(1);
  }, [searchParams]);

  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category)).values()).sort(), [items]);
  const locations = useMemo(() => Array.from(new Set(items.map((item) => item.location)).values()).sort(), [items]);
  const suppliers = useMemo(() => Array.from(new Set(items.map((item) => item.supplierName)).values()).sort(), [items]);
  const filteredItems = useMemo(
    () => selectInventory(items, {
      searchText: search,
      ...(category ? { category } : {}),
      ...(location ? { location } : {}),
      ...(supplier ? { supplier } : {}),
      ...(riskGroup ? { riskGroup } : {}),
      sortBy,
      sortDirection,
      asOfDate: DEMO_AS_OF_DATE,
      riskThresholds: settings.riskThresholds,
    }),
    [items, search, category, location, supplier, riskGroup, sortBy, sortDirection, settings.riskThresholds],
  );
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedItems = filteredItems.filter((item) => selectedIds.includes(item.id));
  const hasFilters = Boolean(search || category || location || supplier || riskGroup);

  const writeSearchParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setLocation("");
    setSupplier("");
    setRiskGroup("");
    setSearchParams({}, { replace: true });
    setPage(1);
  };

  const toggleItem = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  };

  const togglePage = (checked: boolean) => {
    const pageIds = pageItems.map((item) => item.id);
    setSelectedIds((current) => checked
      ? Array.from(new Set([...current, ...pageIds]))
      : current.filter((id) => !pageIds.includes(id)));
  };

  const exportItems = (exportRows: readonly InventoryItem[], label: string) => {
    if (!exportRows.length) return;
    downloadTextFile(`navetra-${label}-${new Date().toISOString().slice(0, 10)}.csv`, inventoryToCsv(exportRows));
    showToast({ tone: "success", title: `${exportRows.length} rows exported`, description: "A CSV file was generated from the current in-browser data." });
  };

  const handleRefresh = async () => {
    await refresh();
    showToast({ tone: "info", title: "Local data is current", description: "No live API is connected; this refresh updates the local snapshot timestamp only." });
  };

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="SUPPLY RECORDS"
        title="Inventory"
        description="Search, filter, and review the stock records that inform your shortage outlook."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => exportItems(filteredItems, "inventory")} disabled={!filteredItems.length}><Download size={15} /> Export CSV</Button>
            <Button type="button" variant="secondary" onClick={() => void handleRefresh()} disabled={isLoading}><RefreshCw size={15} /> Refresh</Button>
          </>
        }
      />

      <div className="inventory-summary-row">
        <div className="inventory-summary-row__left">
          <SearchInput value={search} onChange={(value) => { setSearch(value); writeSearchParam("search", value); setPage(1); }} label="Search by item name, SKU, category, or supplier" placeholder="Search items or SKU…" />
          <SelectFilter label="Category" value={category} options={categories} onChange={(value) => { setCategory(value); writeSearchParam("category", value); setPage(1); }} />
          <SelectFilter label="Location" value={location} options={locations} onChange={(value) => { setLocation(value); writeSearchParam("location", value); setPage(1); }} />
          <SelectFilter label="Supplier" value={supplier} options={suppliers} onChange={(value) => { setSupplier(value); writeSearchParam("supplier", value); setPage(1); }} />
          <label className="select-filter"><span>Risk</span><select className="capitalize-select" value={riskGroup} onChange={(event) => { const value = event.target.value as RiskGroup | ""; setRiskGroup(value); writeSearchParam("riskGroup", value); setPage(1); }} aria-label="Filter by risk group"><option value="">All risk</option>{riskOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        </div>
        <div className="inventory-summary-row__right">
          <label className="select-filter"><span>Sort</span><select value={sortBy} onChange={(event) => { setSortBy(event.target.value as InventorySortKey); setPage(1); }} aria-label="Sort inventory"><option value="riskLevel">Urgency</option><option value="daysOfStock">Days of stock</option><option value="projectedStockOutDate">Stock-out date</option><option value="currentStock">Available stock</option><option value="averageDailyUsage">Daily consumption</option></select></label>
          <Button variant="secondary" className="sort-direction-button" type="button" onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")} aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}><span>{sortDirection === "asc" ? <ArrowUpNarrowWide size={15} /> : <ArrowDownWideNarrow size={15} />}</span>{sortDirection === "asc" ? "Ascending" : "Descending"}</Button>
        </div>
      </div>

      <div className="inventory-status-line">
        <span><strong>{filteredItems.length}</strong> of {items.length} items</span>
        <span className="inventory-status-line__source"><span className="demo-data-banner__dot" />{dataset?.source === "demo" ? "Synthetic demo data" : dataset?.source === "imported" ? "Imported locally · session only" : dataset?.source === "edited" ? "Local edits · session only" : "Inventory data"}</span>
        {hasFilters ? <button className="filter-clear" type="button" onClick={clearFilters}><X size={13} /> Clear filters</button> : null}
        {selectedItems.length ? <div className="table-toolbar-selection"><span>{selectedItems.length} selected</span><Button variant="secondary" className="button--small" type="button" onClick={() => exportItems(selectedItems, "selection")}><Download size={14} /> Export selection</Button><Button variant="text" type="button" onClick={() => setSelectedIds([])}>Clear selection</Button></div> : null}
      </div>

      <section className="panel table-panel" aria-label="Inventory records">
        {isLoading ? (
          <EmptyState title="Loading inventory" description="Preparing the local demo inventory…" />
        ) : error ? (
          <EmptyState title="Inventory could not be loaded" description={error} />
        ) : filteredItems.length ? (
          <>
            <InventoryTable
              items={pageItems}
              selectedIds={selectedIds}
              onToggleItem={toggleItem}
              onTogglePage={togglePage}
              onEdit={setEditItem}
              thresholds={settings.riskThresholds}
              compact={settings.compactTable}
            />
            <div className="table-pagination">
              <span>Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} items</span>
              <div className="table-pagination__controls"><button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page">‹</button><span>Page {safePage} of {pageCount}</span><button type="button" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Next page">›</button></div>
            </div>
          </>
        ) : (
          <EmptyState title="No matching supplies" description="Try a different search or clear filters to see more inventory records." />
        )}
      </section>
      <p className="page-footnote"><Filter size={14} /> Estimated cover and risk are generated from current demo stock, usage, lead time, and configurable thresholds. This view is not connected to live stock.</p>
      {editItem ? <InventoryFormModal item={editItem} onClose={() => setEditItem(null)} /> : null}
    </div>
  );
}
