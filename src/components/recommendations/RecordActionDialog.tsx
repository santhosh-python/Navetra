import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FormField, fieldAria } from '../common/FormField';
import { useActivity } from '../../hooks/useActivity';
import { useNotifications } from '../../hooks/useNotifications';

/** Actions a person can record. Recording only writes a note to this session's activity log. */
export const RECORDABLE_ACTIONS = [
  'Reorder request prepared internally (not sent)',
  'Supplier contacted by phone or email (outside Navetra)',
  'Stock transfer arranged between locations (outside Navetra)',
  'Physical stock count completed',
  'Consumption reviewed with the ward or team',
  'Safety stock level reviewed',
  'No action needed after review',
] as const;

export interface ActionTarget {
  itemId: string;
  itemName: string;
}

interface RecordActionDialogProps {
  open: boolean;
  onClose: () => void;
  target: ActionTarget | null;
  /** Action selected when the dialog opens. Must be one of RECORDABLE_ACTIONS. */
  defaultAction?: (typeof RECORDABLE_ACTIONS)[number];
}

export function RecordActionDialog({ open, onClose, target, defaultAction = RECORDABLE_ACTIONS[0] }: RecordActionDialogProps) {
  const { recordAction } = useActivity();
  const { showToast } = useNotifications();
  const [actionTaken, setActionTaken] = useState<string>(defaultAction);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActionTaken(defaultAction);
      setNote('');
      setError(null);
    }
  }, [open, target?.itemId]);

  const save = () => {
    if (!target) return;
    if (note.trim().length > 500) {
      setError('Keep the note under 500 characters.');
      return;
    }
    recordAction(target.itemId, actionTaken, note.trim());
    showToast(`Recorded for ${target.itemName}. No order or supplier message was sent.`, 'info');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record an action"
      description={target ? `For ${target.itemName}. Recording a note does not place an order or contact a supplier.` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!target}>
            Save record
          </Button>
        </>
      }
    >
      <div className="stack-4">
        <FormField id="record-action-type" label="What was done?" hint="Choose what happened outside this app. Navetra only keeps the record.">
          <select id="record-action-type" className="select" value={actionTaken} onChange={(event) => setActionTaken(event.target.value)}>
            {RECORDABLE_ACTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="record-action-note" label="Note (optional)" error={error ?? undefined}>
          <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} {...fieldAria('record-action-note', undefined, error ?? undefined)} />
        </FormField>
        <p className="form-note">Saved to the activity log for this item for this session only. No supplier message or order is created.</p>
      </div>
    </Modal>
  );
}
