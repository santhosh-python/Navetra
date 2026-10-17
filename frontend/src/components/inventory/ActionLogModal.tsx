import { useState, type FormEvent } from "react";
import type { InventoryItem } from "../../types/inventory";
import { useAppState } from "../../hooks/useAppState";
import { useToast } from "../../hooks/useToast";
import { Button } from "../common/Button";
import { Modal } from "../common/Modal";

interface ActionLogModalProps {
  item: InventoryItem;
  onClose: () => void;
}

export function ActionLogModal({ item, onClose }: ActionLogModalProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { addActivity } = useAppState();
  const showToast = useToast();

  const saveNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!note.trim()) {
      setError("Add a short note before saving the reminder.");
      return;
    }
    addActivity(item.id, `Supplier follow-up reminder for ${item.supplierName}: ${note.trim()}`);
    showToast({ tone: "success", title: "Reminder recorded locally", description: "No email, call, or supplier message was sent." });
    onClose();
  };

  return (
    <Modal
      title="Record supplier follow-up"
      description={`Supplier contact is not connected. Add a local reminder for ${item.supplierName}; this does not send a message.`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="supplier-action-form" variant="primary">Save reminder</Button>
        </>
      }
    >
      <form id="supplier-action-form" onSubmit={saveNote} className="app-page-grid">
        <div className="key-value-grid">
          <div className="key-value"><span>Item</span><strong>{item.name}</strong></div>
          <div className="key-value"><span>Supplier</span><strong>{item.supplierName}</strong></div>
          <div className="key-value"><span>Expected lead time</span><strong>{item.leadTimeDays} days</strong></div>
        </div>
        <label className="field">
          <span>Follow-up note <b>*</b></span>
          <textarea value={note} onChange={(event) => { setNote(event.target.value); setError(null); }} placeholder="e.g. Confirm dispatch date and available quantity" required />
        </label>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </form>
    </Modal>
  );
}
