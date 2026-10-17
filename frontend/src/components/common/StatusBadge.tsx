import type { ReactNode } from "react";
import type { InventoryRiskLevel } from "../../types/inventory";

export type StatusBadgeTone = InventoryRiskLevel | "demo" | "neutral" | "warning" | "safe";

interface StatusBadgeProps {
  tone?: StatusBadgeTone;
  children: ReactNode;
}

export function StatusBadge({ tone = "neutral", children }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
