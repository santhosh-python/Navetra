import { createContext } from "react";
import type {
  ActivityEntry,
  AppSettings,
  DemoOrganization,
  InventoryItemPatch,
  RecommendationActionStatus,
  SavedScenario,
} from "../types/app";
import type { InventoryItem } from "../types/inventory";
import type { InventoryDataSource, InventoryDataset } from "../services/inventoryService";

export interface AppStateContextValue {
  dataset: InventoryDataset | null;
  allItems: InventoryItem[];
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  lastRefreshedAt: Date | null;
  refresh: () => Promise<void>;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, patch: InventoryItemPatch) => void;
  replaceInventoryItems: (items: InventoryItem[], source?: InventoryDataSource) => void;
  organizations: readonly DemoOrganization[];
  selectedOrganization: DemoOrganization;
  setSelectedOrganizationId: (id: string) => void;
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  readNotificationIds: readonly string[];
  markNotificationRead: (id: string) => void;
  savedScenarios: readonly SavedScenario[];
  saveScenario: (scenario: Omit<SavedScenario, "id" | "createdAt">) => void;
  removeScenario: (id: string) => void;
  recommendationActions: Readonly<Record<string, RecommendationActionStatus>>;
  setRecommendationAction: (id: string, status: RecommendationActionStatus) => void;
  clearRecommendationAction: (id: string) => void;
  activity: readonly ActivityEntry[];
  addActivity: (inventoryItemId: string, description: string) => void;
}

export const AppStateContext = createContext<AppStateContextValue | null>(null);
