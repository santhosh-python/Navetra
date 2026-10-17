import { useMemo, useState, type FormEvent } from "react";
import { useAppState } from "../../hooks/useAppState";
import { useToast } from "../../hooks/useToast";
import type { InventoryCriticality, InventoryItem } from "../../types/inventory";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface InventoryFormModalProps {
  onClose: () => void;
  item?: InventoryItem;
}

interface InventoryFormValues {
  sku: string;
  name: string;
  category: string;
  location: string;
  unit: string;
  currentStock: string;
  averageDailyUsage: string;
  minimumStock: string;
  safetyStock: string;
  supplierName: string;
  leadTimeDays: string;
  expectedDeliveryDate: string;
  incomingQuantity: string;
  unitCost: string;
  criticality: InventoryCriticality;
}

const categoryDefaults = [
  "Essential medicines",
  "Medical consumables",
  "Laboratory supplies",
  "Food and kitchen",
  "Cleaning and sanitation",
  "Emergency supplies",
];

export function InventoryFormModal({ onClose, item }: InventoryFormModalProps) {
  const { allItems, addInventoryItem, updateInventoryItem, selectedOrganization, settings } = useAppState();
  const showToast = useToast();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [safetyStockEdited, setSafetyStockEdited] = useState(Boolean(item));
  const [form, setForm] = useState<InventoryFormValues>(() => ({
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    category: item?.category ?? categoryDefaults[0]!,
    location: item?.location ?? selectedOrganization.locations?.[0] ?? allItems[0]?.location ?? "Hyderabad Central",
    unit: item?.unit ?? "boxes",
    currentStock: item?.currentStock.toString() ?? "0",
    averageDailyUsage: item?.averageDailyUsage.toString() ?? "0",
    minimumStock: item?.minimumStock.toString() ?? "0",
    safetyStock: item?.safetyStock.toString() ?? "0",
    supplierName: item?.supplierName ?? "",
    leadTimeDays: item?.leadTimeDays.toString() ?? "1",
    expectedDeliveryDate: item?.expectedDeliveryDate ?? "",
    incomingQuantity: item?.incomingQuantity.toString() ?? "0",
    unitCost: item?.unitCost.toString() ?? "0",
    criticality: item?.criticality ?? "medium",
  }));

  const categories = useMemo(
    () => Array.from(new Set([...categoryDefaults, ...allItems.map((record) => record.category)])),
    [allItems],
  );
  const locations = useMemo(
    () => Array.from(new Set([...allItems.map((record) => record.location), form.location].filter(Boolean))),
    [allItems, form.location],
  );

  const updateField = <K extends keyof InventoryFormValues>(key: K, value: InventoryFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const duplicateSku = allItems.find(
      (existing) => existing.sku.toLowerCase() === form.sku.trim().toLowerCase() && existing.id !== item?.id,
    );
    if (duplicateSku) {
      setSubmitError("That SKU already exists. Use a unique SKU for each item.");
      return;
    }

    const nextItem: InventoryItem = {
      id: item?.id ?? `local-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category,
      location: form.location,
      unit: form.unit.trim(),
      currentStock: Number(form.currentStock),
      averageDailyUsage: Number(form.averageDailyUsage),
      minimumStock: Number(form.minimumStock),
      safetyStock: Number(form.safetyStock),
      supplierName: form.supplierName.trim(),
      leadTimeDays: Number(form.leadTimeDays),
      expectedDeliveryDate: form.expectedDeliveryDate || null,
      incomingQuantity: Number(form.incomingQuantity),
      unitCost: Number(form.unitCost),
      criticality: form.criticality,
    };

    if (item) {
      updateInventoryItem(item.id, nextItem);
    } else {
      addInventoryItem(nextItem);
    }
    showToast({
      tone: "success",
      title: item ? "Inventory item updated" : "Inventory item added",
      description: "This change is stored in the current browser session only.",
    });
    onClose();
  };

  return (
    <Modal
      title={item ? "Edit inventory item" : "Add inventory item"}
      description="Keep stock, usage, and replenishment values in the same unit. Changes remain local to this demo session."
      onClose={onClose}
      size="wide"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="inventory-form" variant="primary">{item ? "Save changes" : "Add item"}</Button>
        </>
      }
    >
      <form id="inventory-form" className="form-grid" onSubmit={handleSubmit}>
        {submitError ? <p className="form-error form-grid__full" role="alert">{submitError}</p> : null}
        <label className="field">
          <span>Item name <b>*</b></span>
          <input required maxLength={100} value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="e.g. Examination gloves" />
        </label>
        <label className="field">
          <span>SKU <b>*</b></span>
          <input required maxLength={40} value={form.sku} onChange={(event) => updateField("sku", event.target.value)} placeholder="e.g. PPE-GLV-M" />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Location</span>
          <select value={form.location} onChange={(event) => updateField("location", event.target.value)}>
            {locations.map((location) => <option key={location}>{location}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Unit <b>*</b></span>
          <input required value={form.unit} onChange={(event) => updateField("unit", event.target.value)} placeholder="boxes, packs, cases…" />
        </label>
        <label className="field">
          <span>Criticality</span>
          <select value={form.criticality} onChange={(event) => updateField("criticality", event.target.value as InventoryCriticality)}>
            <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </label>
        <label className="field">
          <span>Available stock</span>
          <input type="number" min="0" step="any" required value={form.currentStock} onChange={(event) => updateField("currentStock", event.target.value)} />
        </label>
        <label className="field">
          <span>Average daily usage</span>
          <input type="number" min="0" step="any" required value={form.averageDailyUsage} onChange={(event) => {
            const nextUsage = event.target.value;
            updateField("averageDailyUsage", nextUsage);
            if (!safetyStockEdited && !item) updateField("safetyStock", String((Number(nextUsage) || 0) * settings.defaultSafetyStockDays));
          }} />
        </label>
        <label className="field">
          <span>Minimum stock</span>
          <input type="number" min="0" step="any" required value={form.minimumStock} onChange={(event) => updateField("minimumStock", event.target.value)} />
        </label>
        <label className="field">
          <span>Safety stock</span>
          <input type="number" min="0" step="any" required value={form.safetyStock} onChange={(event) => { setSafetyStockEdited(true); updateField("safetyStock", event.target.value); }} />
        </label>
        <label className="field">
          <span>Supplier name <b>*</b></span>
          <input required value={form.supplierName} onChange={(event) => updateField("supplierName", event.target.value)} placeholder="Supplier" />
        </label>
        <label className="field">
          <span>Supplier lead time (days)</span>
          <input type="number" min="0" step="1" required value={form.leadTimeDays} onChange={(event) => updateField("leadTimeDays", event.target.value)} />
        </label>
        <label className="field">
          <span>Expected delivery date</span>
          <input type="date" value={form.expectedDeliveryDate} onChange={(event) => updateField("expectedDeliveryDate", event.target.value)} />
        </label>
        <label className="field">
          <span>Incoming quantity</span>
          <input type="number" min="0" step="any" required value={form.incomingQuantity} onChange={(event) => updateField("incomingQuantity", event.target.value)} />
        </label>
        <label className="field">
          <span>Unit cost (INR)</span>
          <input type="number" min="0" step="any" required value={form.unitCost} onChange={(event) => updateField("unitCost", event.target.value)} />
        </label>
      </form>
    </Modal>
  );
}
