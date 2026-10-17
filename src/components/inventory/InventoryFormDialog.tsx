import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Alert } from '../common/Alert';
import { FormField, fieldAria } from '../common/FormField';
import { useInventory } from '../../hooks/useInventory';
import { useSettings } from '../../hooks/useSettings';
import { useActivity } from '../../hooks/useActivity';
import { useNotifications } from '../../hooks/useNotifications';
import { EMPTY_INVENTORY_FORM, INVENTORY_FIELDS, type InventoryFieldKey } from '../../lib/inventorySchema';
import { validateInventoryRecord, type InventoryRecordErrors } from '../../lib/validators';
import { ITEM_CRITICALITIES, type InventoryItem } from '../../types/inventory';
import { DEMO_AS_OF_DATE } from '../../lib/dates';
import { CRITICALITY_LABELS } from '../../lib/priorityScoring';

type FormValues = Record<InventoryFieldKey, string>;

function toFormValues(item: InventoryItem | null, defaults: { leadTimeDays: number; location: string; category: string }): FormValues {
  if (!item) {
    return {
      ...EMPTY_INVENTORY_FORM,
      location: defaults.location,
      category: defaults.category,
      leadTimeDays: String(defaults.leadTimeDays),
      lastCountDate: DEMO_AS_OF_DATE,
      unit: '',
    };
  }
  return {
    sku: item.sku,
    name: item.name,
    category: item.category,
    location: item.location,
    unit: item.unit,
    currentStock: String(item.currentStock),
    averageDailyUsage: String(item.averageDailyUsage),
    minimumStock: String(item.minimumStock),
    safetyStock: String(item.safetyStock),
    supplierName: item.supplierName,
    leadTimeDays: String(item.leadTimeDays),
    expectedDeliveryDate: item.expectedDeliveryDate ?? '',
    incomingQuantity: String(item.incomingQuantity),
    unitCost: String(item.unitCost),
    criticality: item.criticality,
    servicesAffected: String(item.servicesAffected),
    alternativeSupplierAvailable: item.alternativeSupplierAvailable ? 'yes' : 'no',
    stockHeldElsewhere: String(item.stockHeldElsewhere),
    lastCountDate: item.lastCountDate,
  };
}

interface InventoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSaved?: (item: InventoryItem) => void;
}

/** Add or edit one item. Uses the same field definitions and validation as CSV import. */
export function InventoryFormDialog({ open, onClose, item, onSaved }: InventoryFormDialogProps) {
  const { items, addItem, updateItem, locations, categories } = useInventory();
  const { settings } = useSettings();
  const { logEvent } = useActivity();
  const { showToast } = useNotifications();
  const [values, setValues] = useState<FormValues>(() => toFormValues(item, { leadTimeDays: settings.defaultLeadTimeDays, location: locations[0] ?? '', category: categories[0] ?? '' }));
  const [errors, setErrors] = useState<InventoryRecordErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form each time the dialog opens, so a previous edit never leaks into a new one.
  useEffect(() => {
    if (open) {
      setValues(toFormValues(item, { leadTimeDays: settings.defaultLeadTimeDays, location: locations[0] ?? '', category: categories[0] ?? '' }));
      setErrors({});
      setSubmitError(null);
    }
  }, [open, item?.id]);

  const existingSkus = useMemo(() => items.map((existing) => existing.sku), [items]);
  const isEdit = item !== null;

  const setField = (key: InventoryFieldKey) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = async () => {
    const result = validateInventoryRecord(values, { existingSkus, ignoreSku: item?.sku });
    setErrors(result.errors);
    setSubmitError(null);
    if (!result.item) return;
    setSaving(true);
    try {
      const saved = isEdit && item ? await updateItem(item.id, result.item) : await addItem(result.item);
      if (isEdit) logEvent(saved.id, 'Item details edited', 'Details were changed in the item form.');
      showToast(isEdit ? `${saved.name} saved.` : `${saved.name} added to inventory.`);
      onSaved?.(saved);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'The item could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={isEdit ? `Edit ${item?.name}` : 'Add inventory item'}
      description={isEdit ? 'Changes update every page immediately in this browser session.' : 'Fields marked optional can be left blank.'}
      footer={
        <>
          <span className="modal__footer-note">{errorCount > 0 ? `${errorCount} field${errorCount === 1 ? '' : 's'} need attention` : 'Saved only in this browser session (demo data).'}</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </>
      }
    >
      {submitError && (
        <div style={{ marginBottom: 16 }}>
          <Alert tone="error">{submitError}</Alert>
        </div>
      )}
      <form
        className="form-grid"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        {INVENTORY_FIELDS.map((field) => {
          const id = `item-field-${field.key}`;
          const hint = `${field.help}${field.required ? '' : ' Optional.'}`;
          const error = errors[field.key];
          const control = (() => {
            if (field.key === 'criticality') {
              return (
                <select className="select" {...fieldAria(id, hint, error)} value={values.criticality} onChange={setField('criticality')}>
                  {ITEM_CRITICALITIES.map((level) => (
                    <option key={level} value={level}>
                      {CRITICALITY_LABELS[level]}
                    </option>
                  ))}
                </select>
              );
            }
            if (field.type === 'boolean') {
              return (
                <select className="select" {...fieldAria(id, hint, error)} value={values.alternativeSupplierAvailable} onChange={setField('alternativeSupplierAvailable')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              );
            }
            if (field.type === 'date') {
              return <input type="date" className="input" {...fieldAria(id, hint, error)} value={values[field.key]} onChange={setField(field.key)} />;
            }
            if (field.key === 'category' || field.key === 'location') {
              const listId = `${id}-options`;
              const options = field.key === 'category' ? categories : locations;
              return (
                <>
                  <input list={listId} className="input" {...fieldAria(id, hint, error)} value={values[field.key]} onChange={setField(field.key)} autoComplete="off" />
                  <datalist id={listId}>
                    {options.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </>
              );
            }
            return (
              <input
                type="text"
                inputMode={field.type === 'text' ? 'text' : 'decimal'}
                className="input"
                {...fieldAria(id, hint, error)}
                value={values[field.key]}
                onChange={setField(field.key)}
                placeholder={field.unitHint}
                autoComplete="off"
              />
            );
          })();
          return (
            <FormField key={field.key} id={id} label={field.required ? field.label : `${field.label} (optional)`} hint={hint} error={error}>
              {control}
            </FormField>
          );
        })}
      </form>
    </Modal>
  );
}
