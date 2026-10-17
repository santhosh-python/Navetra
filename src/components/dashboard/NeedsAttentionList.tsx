import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Check, ArrowRight, CircleCheck, Phone } from 'lucide-react';
import { RecordActionDialog, type ActionTarget } from '../recommendations/RecordActionDialog';
import { useInventory } from '../../hooks/useInventory';
import { useActivity } from '../../hooks/useActivity';
import { isInActiveQueue } from '../../lib/recommendationStatus';
import { formatLongDate, formatShortDate } from '../../lib/dates';
import { formatWholeDaysRemaining } from '../../lib/formatters';
import { RiskBadge } from '../common/StatusBadge';
import { Button, buttonClasses } from '../common/Button';
import { EmptyState } from '../common/EmptyState';

/** Top items from the ranked recommendations, excluding snoozed ones. Uses the same ranking as the Recommendations page. */
interface NeedsAttentionListProps {
  limit?: number;
  /** When given, only these items are listed (used by the Overview location and category filters). */
  itemIds?: string[];
}

export function NeedsAttentionList({ limit = 5, itemIds }: NeedsAttentionListProps) {
  const { recommendations, asOfDate } = useInventory();
  const { getStatus, setReviewed } = useActivity();
  const [supplierTarget, setSupplierTarget] = useState<ActionTarget | null>(null);
  const scopeIds = itemIds ? new Set(itemIds) : null;

  const queue = recommendations
    .filter((recommendation) => (scopeIds ? scopeIds.has(recommendation.itemId) : true))
    .filter((recommendation) => isInActiveQueue(getStatus(recommendation.itemId), asOfDate))
    .slice(0, limit);

  if (queue.length === 0) {
    return <EmptyState compact icon={<CircleCheck size={20} aria-hidden="true" />} title="Nothing needs attention" description="No critical or warning items under the current thresholds, or all have been snoozed." />;
  }

  return (
    <>
    <ol className="attention-list" style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Items that need attention, most urgent first">
      {queue.map((recommendation, index) => {
        const status = getStatus(recommendation.itemId);
        return (
          <li key={recommendation.itemId} className="attention-item">
            <div style={{ minWidth: 0 }}>
              <div className="attention-item__title">
                <span className="num text-muted">{index + 1}.</span>
                <Link to={`/inventory/${encodeURIComponent(recommendation.itemId)}`} style={{ color: 'var(--color-text)' }}>
                  {recommendation.itemName}
                </Link>
                <RiskBadge risk={recommendation.risk} />
                {status.reviewed && <span className="badge badge--info">Reviewed</span>}
              </div>
              <p className="attention-item__reason">{recommendation.reason}</p>
              <p className="attention-item__action">
                <ArrowRight size={13} aria-hidden="true" style={{ verticalAlign: '-2px' }} /> {recommendation.action}
              </p>
            </div>
            <dl className="attention-item__facts" style={{ margin: 0 }}>
              <div>
                Stock lasts
                <strong>{recommendation.daysUntilStockOut === null ? 'No usage' : formatWholeDaysRemaining(recommendation.daysUntilStockOut)}</strong>
              </div>
              <div>
                Runs out
                <strong>{recommendation.stockOutDate ? formatShortDate(recommendation.stockOutDate) : '—'}</strong>
              </div>
              <div>
                Delivery
                <strong>{formatLongDate(recommendation.replenishmentDate)}</strong>
              </div>
            </dl>
            <div className="attention-item__buttons">
              <Link className={buttonClasses({ size: 'sm' })} to={`/inventory/${encodeURIComponent(recommendation.itemId)}`}>
                View item
              </Link>
              <Button size="sm" variant="ghost" icon={<Check size={14} aria-hidden="true" />} onClick={() => setReviewed(recommendation.itemId, !status.reviewed)}>
                {status.reviewed ? 'Undo review' : 'Mark reviewed'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<Phone size={14} aria-hidden="true" />}
                title="Records a supplier contact you made outside Navetra. Navetra does not contact suppliers."
                onClick={() => setSupplierTarget({ itemId: recommendation.itemId, itemName: recommendation.itemName })}
              >
                Record supplier contact
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
      <RecordActionDialog
        open={supplierTarget !== null}
        target={supplierTarget}
        defaultAction="Supplier contacted by phone or email (outside Navetra)"
        onClose={() => setSupplierTarget(null)}
      />
    </>
  );
}
