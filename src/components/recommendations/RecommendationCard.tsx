import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, ChevronRight, Clock, Undo2 } from 'lucide-react';
import type { Recommendation, RecommendationStatus } from '../../types/recommendations';
import { RiskBadge, CriticalityBadge, Badge } from '../common/StatusBadge';
import { Button, buttonClasses } from '../common/Button';
import { DropdownMenu } from '../common/DropdownMenu';
import { formatCurrency, formatQuantity, formatWholeDaysRemaining } from '../../lib/formatters';
import { formatLongDate, formatShortDate } from '../../lib/dates';
import { describeSuggestedOrder } from '../../lib/recommendations';
import { PRIORITY_MAX_SCORE } from '../../lib/priorityScoring';
import { isSnoozed } from '../../lib/recommendationStatus';

interface RecommendationCardProps {
  rank: number;
  recommendation: Recommendation;
  status: RecommendationStatus;
  asOfDate: string;
  unit: string;
  onToggleReviewed: () => void;
  onSnooze: (days: number | null) => void;
  onRecordAction: () => void;
}

/**
 * One ranked recommendation. The score and its breakdown are always available, so nothing is hidden
 * behind a number the user cannot inspect.
 */
export function RecommendationCard({ rank, recommendation, status, asOfDate, unit, onToggleReviewed, onSnooze, onRecordAction }: RecommendationCardProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const snoozed = isSnoozed(status, asOfDate);
  const critical = recommendation.risk === 'critical';
  const days = recommendation.daysUntilStockOut;

  return (
    <article className={`card recommendation ${critical ? 'recommendation--critical' : ''}`} aria-labelledby={`rec-${recommendation.itemId}`}>
      <div className="recommendation__rank" aria-label={`Rank ${rank}`}>
        {rank}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="recommendation__head">
          <div>
            <h2 className="recommendation__title" id={`rec-${recommendation.itemId}`}>
              {recommendation.itemName}
            </h2>
            <div className="text-small text-muted">
              {recommendation.sku} · Priority score <strong className="num">{recommendation.priorityScore}</strong> of {PRIORITY_MAX_SCORE}
            </div>
          </div>
          <div className="row row--wrap">
            <RiskBadge risk={recommendation.risk} />
            <CriticalityBadge criticality={recommendation.criticality} />
            {status.reviewed && <Badge tone="info">Reviewed</Badge>}
            {snoozed && (
              <Badge tone="neutral">
                <Clock size={12} aria-hidden="true" />
                Snoozed until {formatShortDate(status.snoozedUntil)}
              </Badge>
            )}
          </div>
        </div>

        <div className="recommendation__action" role="note">
          <ArrowRight size={14} aria-hidden="true" />
          {recommendation.action}
        </div>
        <p className="text-small" style={{ marginTop: 8, lineHeight: 1.55 }}>
          {recommendation.reason}
        </p>

        <div className="recommendation__meta">
          <span>
            Stock lasts: <strong>{days === null ? 'no usage recorded' : formatWholeDaysRemaining(days)}</strong>
          </span>
          <span>
            Runs out at current use: <strong>{recommendation.stockOutDate ? formatLongDate(recommendation.stockOutDate) : '—'}</strong>
          </span>
          <span>
            Replenishment: <strong>{formatLongDate(recommendation.replenishmentDate)}</strong>
          </span>
          {recommendation.gapDays > 0 && (
            <span className="text-critical">
              Gap: <strong>{recommendation.gapDays} days</strong>
            </span>
          )}
          <span>
            Suggested order: <strong>{recommendation.suggestedReorderQuantity > 0 ? formatQuantity(recommendation.suggestedReorderQuantity, unit) : 'none'}</strong>
            {recommendation.suggestedReorderValue > 0 && <> ({formatCurrency(recommendation.suggestedReorderValue)})</>}
          </span>
        </div>
        <p className="text-xs text-subtle" style={{ marginTop: 6 }}>
          {recommendation.suggestedReorderQuantity > 0 ? describeSuggestedOrder(recommendation, unit) : 'No order is suggested by the current rules.'}
        </p>

        <div className="recommendation__buttons">
          <Button size="sm" variant={status.reviewed ? 'secondary' : 'primary'} icon={status.reviewed ? <Undo2 size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} onClick={onToggleReviewed}>
            {status.reviewed ? 'Mark not reviewed' : 'Mark reviewed'}
          </Button>
          <DropdownMenu
            ariaLabel={`Snooze ${recommendation.itemName}`}
            label="Snooze"
            size="sm"
            icon={<Clock size={14} aria-hidden="true" />}
            items={[
              { id: '1', label: 'Hide for 1 day', onSelect: () => onSnooze(1) },
              { id: '7', label: 'Hide for 7 days', onSelect: () => onSnooze(7) },
              { id: '14', label: 'Hide for 14 days', onSelect: () => onSnooze(14) },
              ...(snoozed ? [{ id: 'wake', label: 'Show now', onSelect: () => onSnooze(null) }] : []),
            ]}
          />
          <Link className={buttonClasses({ size: 'sm' })} to={`/inventory/${encodeURIComponent(recommendation.itemId)}`}>
            View item
          </Link>
          <Button size="sm" onClick={onRecordAction}>
            Record action
          </Button>
        </div>

        <div className="recommendation__details">
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={detailsOpen} onClick={() => setDetailsOpen((current) => !current)}>
            {detailsOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
            Why this rank: {recommendation.priorityScore} of {PRIORITY_MAX_SCORE} points
          </button>
          {detailsOpen && (
            <div style={{ marginTop: 12 }}>
              <p className="text-xs text-muted" style={{ marginBottom: 10 }}>
                Priority points come from fixed, disclosed rules (not a statistical model or confidence score). Items are ranked by total points, then by earliest stock-out date.
              </p>
              <table className="priority-table">
                <thead>
                  <tr>
                    <th scope="col">Factor</th>
                    <th scope="col">Why</th>
                    <th scope="col" className="num">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recommendation.priorityFactors.map((factor) => (
                    <tr key={factor.id}>
                      <td>{factor.label}</td>
                      <td>
                        {factor.explanation}
                        <span className="priority-bar" aria-hidden="true">
                          <span style={{ width: `${(factor.points / factor.maxPoints) * 100}%` }} />
                        </span>
                      </td>
                      <td className="num">
                        {factor.points} / {factor.maxPoints}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}>
                      <strong>Total</strong>
                    </td>
                    <td className="num">
                      <strong>
                        {recommendation.priorityScore} / {PRIORITY_MAX_SCORE}
                      </strong>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-subtle" style={{ marginTop: 8 }}>
                Values come from the synthetic demo dataset and the thresholds in Settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
