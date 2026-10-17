import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, ChevronUp, Clock3, FileText, Truck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { ActionLogModal } from "../components/inventory/ActionLogModal";
import { Button } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { StatusBadge } from "../components/common/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { DEMO_AS_OF_DATE } from "../data/demoInventory";
import { useAppState } from "../hooks/useAppState";
import { useToast } from "../hooks/useToast";
import { formatCurrency, formatDate, formatNumber } from "../lib/formatters";
import { buildRecommendations } from "../lib/recommendations";
import type { InventoryItem } from "../types/inventory";

const tabs = ["Active", "Critical", "High", "Reviewed", "Snoozed"] as const;
type RecommendationTab = (typeof tabs)[number];

export function RecommendationsPage() {
  const {
    items,
    settings,
    recommendationActions,
    setRecommendationAction,
    clearRecommendationAction,
    addActivity,
  } = useAppState();
  const showToast = useToast();
  const [searchParams] = useSearchParams();
  const queryItemId = searchParams.get("itemId");
  const [activeTab, setActiveTab] = useState<RecommendationTab>("Active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [contactItem, setContactItem] = useState<InventoryItem | null>(null);

  const recommendations = useMemo(
    () => buildRecommendations(items, DEMO_AS_OF_DATE, settings.riskThresholds),
    [items, settings.riskThresholds],
  );
  const counts = {
    Active: recommendations.filter((recommendation) => !recommendationActions[recommendation.id]).length,
    Critical: recommendations.filter((recommendation) => recommendation.priority === "Critical" && !recommendationActions[recommendation.id]).length,
    High: recommendations.filter((recommendation) => recommendation.priority === "High" && !recommendationActions[recommendation.id]).length,
    Reviewed: recommendations.filter((recommendation) => recommendationActions[recommendation.id] === "reviewed" || recommendationActions[recommendation.id] === "recorded").length,
    Snoozed: recommendations.filter((recommendation) => recommendationActions[recommendation.id] === "snoozed").length,
  };
  const visibleRecommendations = recommendations.filter((recommendation) => {
    if (queryItemId && recommendation.item.id !== queryItemId) return false;
    const action = recommendationActions[recommendation.id];
    if (activeTab === "Active") return !action;
    if (activeTab === "Critical") return recommendation.priority === "Critical" && !action;
    if (activeTab === "High") return recommendation.priority === "High" && !action;
    if (activeTab === "Reviewed") return action === "reviewed" || action === "recorded";
    return action === "snoozed";
  });

  const saveActionNote = (recommendationId: string, item: InventoryItem) => {
    if (!actionNote.trim()) {
      showToast({ tone: "error", title: "Add a note first", description: "A short action note is required before saving." });
      return;
    }
    addActivity(item.id, `Action recorded: ${actionNote.trim()}`);
    setRecommendationAction(recommendationId, "recorded");
    showToast({ tone: "success", title: "Action recorded locally", description: "The note is stored in this browser session only." });
    setNoteId(null);
    setActionNote("");
  };

  const markReviewed = (recommendationId: string, item: InventoryItem) => {
    setRecommendationAction(recommendationId, "reviewed");
    addActivity(item.id, "Shortage recommendation marked as reviewed.");
    showToast({ tone: "success", title: "Marked as reviewed", description: "This status is local to the current session." });
  };

  const snooze = (recommendationId: string, item: InventoryItem) => {
    setRecommendationAction(recommendationId, "snoozed");
    addActivity(item.id, "Shortage recommendation snoozed for this session.");
    showToast({ tone: "info", title: "Recommendation snoozed", description: "You can restore it from the Snoozed tab." });
  };

  const restore = (recommendationId: string, item: InventoryItem) => {
    clearRecommendationAction(recommendationId);
    addActivity(item.id, "Shortage recommendation restored to the active list.");
    showToast({ tone: "success", title: "Recommendation restored", description: "It is active again in this local demo session." });
  };

  return (
    <div className="page-content">
      <PageHeader eyebrow="ACTION CENTRE" title="Recommended Actions" description="Turn shortage warnings into practical decisions." actions={<StatusBadge tone="demo">Transparent rule-based priority</StatusBadge>} />

      <div className="priority-rules-banner">
        <div className="priority-rules-banner__icon"><FileText size={18} /></div>
        <div><strong>How priorities are ranked</strong><p>Critical items are shown first when projected stock cover does not reach lead time or the expected delivery leaves a gap. Next come items below minimum stock, followed by the selected warning buffer. There is no weighted or AI score.</p></div>
        <span className="priority-rules-banner__method">Rules · no score</span>
      </div>

      <div className="recommendation-tabs" role="tablist" aria-label="Recommendation status filter">
        {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)}>{tab}<span>{counts[tab]}</span></button>)}
      </div>

      {visibleRecommendations.length ? (
        <div className="recommendation-list">
          {visibleRecommendations.map((recommendation, index) => {
            const { id, item, priority, reason, explanation, action, metrics, recommendedQuantity, recommendedValue, orderByDate } = recommendation;
            const expanded = expandedId === id;
            const actionStatus = recommendationActions[id];
            const riskTone = priority === "Critical" ? "critical" : priority === "High" ? "high" : "medium";
            return (
              <article className={`recommendation-card${actionStatus ? " recommendation-card--resolved" : ""}`} key={id}>
                <div className="recommendation-card__main">
                  <span className={`recommendation-rank recommendation-rank--${riskTone}`} aria-label={`Priority ${index + 1}`}>{String(index + 1).padStart(2, "0")}</span>
                  <div className="recommendation-title"><Link to={`/items/${item.id}`}>{item.name}</Link><span>{item.sku} · {item.category} · {item.location}</span><span className="recommendation-title__criticality">{item.criticality} operational criticality</span></div>
                  <div className="recommendation-reason"><StatusBadge tone={riskTone}>{priority}</StatusBadge><p>{reason}</p></div>
                  <div className="recommendation-metrics"><span><strong>{metrics.daysOfStock === null ? "—" : formatNumber(metrics.daysOfStock)}</strong> days cover</span><span><strong>{formatDate(metrics.expectedDeliveryDate)}</strong> delivery</span><span><strong>{formatNumber(recommendedQuantity)} {item.unit}</strong> suggested</span></div>
                  <button className="recommendation-expand" type="button" onClick={() => setExpandedId(expanded ? null : id)} aria-expanded={expanded} aria-label={`${expanded ? "Hide" : "Show"} explanation for ${item.name}`}>{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
                  <div className="recommendation-actions">
                    {actionStatus ? <StatusBadge tone={actionStatus === "snoozed" ? "neutral" : "low"}>{actionStatus === "recorded" ? "Action recorded" : actionStatus === "reviewed" ? "Reviewed" : "Snoozed"}</StatusBadge> : null}
                    <Link className="button button--secondary button--small" to={`/items/${item.id}`}>View item</Link>
                    <button className="button button--secondary button--small" type="button" onClick={() => setContactItem(item)}><Truck size={13} /> Contact supplier</button>
                    {!actionStatus ? <button className="button button--primary button--small" type="button" onClick={() => markReviewed(id, item)}><Check size={13} /> Mark reviewed</button> : null}
                    {actionStatus === "snoozed" ? <button className="button button--text" type="button" onClick={() => restore(id, item)}>Restore to active</button> : null}
                    {!actionStatus ? <button className="button button--text" type="button" onClick={() => snooze(id, item)}><Clock3 size={13} /> Snooze</button> : null}
                  </div>
                </div>
                {expanded ? (
                  <div className="recommendation-card__details">
                    <p><strong>Why this is ranked here.</strong> {explanation}</p>
                    <p><strong>Recommended next step.</strong> {action} Suggested reorder: {formatNumber(recommendedQuantity)} {item.unit} (illustrative value {formatCurrency(recommendedValue)}), with an order-by date of {formatDate(orderByDate)}. This is an estimate only; no purchase order has been placed.</p>
                    <div className="recommendation-details-factors"><span>Time to stock-out: <strong>{metrics.daysOfStock === null ? "not calculable" : `${formatNumber(metrics.daysOfStock)} days`}</strong></span><span>Supplier lead time: <strong>{item.leadTimeDays} days</strong></span><span>Criticality: <strong>{item.criticality}</strong></span><span>Incoming quantity: <strong>{formatNumber(item.incomingQuantity)} {item.unit}</strong></span></div>
                    <div className="recommendation-card__details-actions"><Link className="inline-link" to={`/forecasts?itemId=${item.id}`}>Open forecast <ArrowUpRight size={13} /></Link><button className="button button--text" type="button" onClick={() => { setNoteId(noteId === id ? null : id); setActionNote(""); }}>Record action note</button></div>
                    {noteId === id ? <div className="recommendation-action-log"><label className="field"><span>Action note</span><textarea value={actionNote} onChange={(event) => setActionNote(event.target.value)} placeholder="Record a stock check, transfer, supplier follow-up, or other action…" /></label><div className="recommendation-action-log__footer"><Button type="button" variant="primary" className="button--small" onClick={() => saveActionNote(id, item)}>Save note</Button><Button type="button" variant="text" onClick={() => setNoteId(null)}>Cancel</Button></div></div> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title={queryItemId ? "No action for this item" : `No ${activeTab.toLowerCase()} recommendations`} description={queryItemId ? "This item may be within its safe coverage window or outside the selected organization." : "Recommendations are derived from the current demo inventory and your risk settings."} />
      )}
      <p className="page-footnote"><FileText size={14} /> Suggested actions are advisory demo rules. Contact, reorder, and inventory changes are not sent to a supplier or saved to a backend.</p>
      {contactItem ? <ActionLogModal item={contactItem} onClose={() => setContactItem(null)} /> : null}
    </div>
  );
}
