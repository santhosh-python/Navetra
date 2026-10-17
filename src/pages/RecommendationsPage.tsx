import { useMemo, useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { SectionCard } from '../components/common/SectionCard';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { EmptyState, LoadingState } from '../components/common/EmptyState';
import { Alert } from '../components/common/Alert';
import { RecommendationCard } from '../components/recommendations/RecommendationCard';
import { RecordActionDialog, type ActionTarget } from '../components/recommendations/RecordActionDialog';
import { useInventory } from '../hooks/useInventory';
import { useActivity } from '../hooks/useActivity';
import { useNotifications } from '../hooks/useNotifications';
import { isInActiveQueue, NO_RECOMMENDATION_STATUS } from '../lib/recommendationStatus';
import { PRIORITY_DISCLOSURE, PRIORITY_MAX_SCORE } from '../lib/priorityScoring';
import type { RiskLevel } from '../types/inventory';

const FILTERS: { value: RiskLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
];

export function RecommendationsPage() {
  const { recommendations, asOfDate, status, errorMessage, getItemById } = useInventory();
  const { getStatus, setReviewed, snooze } = useActivity();
  const { showToast } = useNotifications();
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [showSnoozed, setShowSnoozed] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);

  const visible = useMemo(
    () =>
      recommendations
        .map((recommendation, index) => ({ recommendation, rank: index + 1 }))
        .filter(({ recommendation }) => riskFilter === 'all' || recommendation.risk === riskFilter)
        .filter(({ recommendation }) => showSnoozed || isInActiveQueue(getStatus(recommendation.itemId), asOfDate)),
    [recommendations, riskFilter, showSnoozed, getStatus, asOfDate],
  );

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Recommendations" subtitle="Loading…" />
        <SectionCard>
          <LoadingState label="Loading recommendations" />
        </SectionCard>
      </>
    );
  }
  if (status === 'error') {
    return (
      <>
        <PageHeader title="Recommendations" />
        <Alert tone="error">{errorMessage ?? 'Recommendations could not be loaded.'}</Alert>
      </>
    );
  }

  const snoozedCount = recommendations.filter((recommendation) => !isInActiveQueue(getStatus(recommendation.itemId), asOfDate)).length;

  return (
    <>
      <PageHeader
        title="Recommendations"
        subtitle="Items ranked by a disclosed priority score. Recording an action keeps a note only. Navetra does not place orders or contact suppliers."
      />

      <SectionCard
        title="How the ranking works"
        description={`Each item gets up to ${PRIORITY_MAX_SCORE} points from the fixed rules below. These are transparent rules, not a statistical model or a confidence score.`}
        footer="Ties are broken by the earliest stock-out date, then by name. Changing a threshold in Settings changes the points."
      >
        <div className="table-wrap" style={{ border: 0, borderRadius: 0 }}>
          <table className="table table--compact">
            <caption className="visually-hidden">Priority score rules</caption>
            <thead>
              <tr>
                <th scope="col">Factor</th>
                <th scope="col">Rule</th>
                <th scope="col" className="num">
                  Max points
                </th>
              </tr>
            </thead>
            <tbody>
              {PRIORITY_DISCLOSURE.map((rule) => (
                <tr key={rule.factor}>
                  <td>{rule.factor}</td>
                  <td className="text-small">{rule.rule}</td>
                  <td className="num">{rule.maxPoints}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td />
                <td className="num">
                  <strong>{PRIORITY_DISCLOSURE.reduce((sum, rule) => sum + rule.maxPoints, 0)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="page-toolbar" style={{ marginTop: 24, alignItems: 'center' }}>
        <SegmentedControl label="Filter by risk" options={FILTERS} value={riskFilter} onChange={setRiskFilter} />
        <label className="check">
          <input type="checkbox" checked={showSnoozed} onChange={(event) => setShowSnoozed(event.target.checked)} />
          Show snoozed ({snoozedCount})
        </label>
        <span className="text-small text-muted" style={{ marginLeft: 'auto' }} aria-live="polite">
          {visible.length} shown of {recommendations.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <SectionCard>
          <EmptyState
            title="No recommendations to show"
            description={recommendations.length === 0 ? 'No item is at critical or warning level under the current thresholds.' : 'Everything matching this filter is snoozed or hidden. Show snoozed items to review them.'}
          />
        </SectionCard>
      ) : (
        <div className="stack-3">
          {visible.map(({ recommendation, rank }) => {
            const status = getStatus(recommendation.itemId) ?? NO_RECOMMENDATION_STATUS;
            return (
              <RecommendationCard
                key={recommendation.itemId}
                rank={rank}
                recommendation={recommendation}
                status={status}
                asOfDate={asOfDate}
                unit={getItemById(recommendation.itemId)?.unit ?? ''}
                onToggleReviewed={() => {
                  setReviewed(recommendation.itemId, !status.reviewed);
                  showToast(status.reviewed ? `${recommendation.itemName} is no longer marked reviewed.` : `${recommendation.itemName} marked reviewed in this session.`, 'info');
                }}
                onSnooze={(days) => {
                  snooze(recommendation.itemId, days);
                  showToast(days === null ? `${recommendation.itemName} is shown again.` : `${recommendation.itemName} hidden for ${days} ${days === 1 ? 'day' : 'days'}.`, 'info');
                }}
                onRecordAction={() => setActionTarget({ itemId: recommendation.itemId, itemName: recommendation.itemName })}
              />
            );
          })}
        </div>
      )}

      <RecordActionDialog open={actionTarget !== null} onClose={() => setActionTarget(null)} target={actionTarget} />
    </>
  );
}
