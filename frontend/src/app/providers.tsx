import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppStateContext } from "./AppStateContext";
import { demoOrganizations } from "../data/demoOrganizations";
import { DEFAULT_SETTINGS } from "../data/defaultSettings";
import { getInventoryDataset, type InventoryDataSource } from "../services/inventoryService";
import type {
  ActivityEntry,
  AppSettings,
  InventoryItemPatch,
  RecommendationActionStatus,
  SavedScenario,
} from "../types/app";
import type { InventoryItem } from "../types/inventory";
import { ToastProvider } from "../components/common/ToastProvider";

function createId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function AppStateProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Awaited<ReturnType<typeof getInventoryDataset>> | null>(null);
  const hasLoadedDemo = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("network");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [recommendationActions, setRecommendationActions] = useState<
    Record<string, RecommendationActionStatus>
  >({});
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!hasLoadedDemo.current) {
        setDataset(await getInventoryDataset());
        hasLoadedDemo.current = true;
      }
      setLastRefreshedAt(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load inventory data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allItems = dataset?.items ?? [];
  const selectedOrganization =
    demoOrganizations.find((organization) => organization.id === selectedOrganizationId) ??
    demoOrganizations[0]!;
  const items = useMemo(
    () =>
      selectedOrganization.locations === null
        ? allItems
        : allItems.filter((item) => selectedOrganization.locations?.includes(item.location)),
    [allItems, selectedOrganization],
  );

  const addInventoryItem = useCallback((item: InventoryItem) => {
    setDataset((current) =>
      current
        ? {
            ...current,
            source: current.source === "demo" ? "edited" : current.source,
            items: [...current.items, item],
          }
        : { source: "edited", items: [item] },
    );
    const entry: ActivityEntry = {
      id: createId("activity"),
      inventoryItemId: item.id,
      description: `Added ${item.name} to the local inventory.`,
      createdAt: new Date().toISOString(),
      source: "local-demo",
    };
    setActivity((current) => [entry, ...current]);
  }, []);

  const updateInventoryItem = useCallback((id: string, patch: InventoryItemPatch) => {
    setDataset((current) =>
      current
        ? {
            ...current,
            source: current.source === "demo" ? "edited" : current.source,
            items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
          }
        : current,
    );
    const item = dataset?.items.find((candidate) => candidate.id === id);
    if (item) {
      const entry: ActivityEntry = {
        id: createId("activity"),
        inventoryItemId: id,
        description: `Updated inventory details for ${item.name}.`,
        createdAt: new Date().toISOString(),
        source: "local-demo",
      };
      setActivity((current) => [entry, ...current]);
    }
  }, [dataset]);

  const replaceInventoryItems = useCallback(
    (nextItems: InventoryItem[], source: InventoryDataSource = "imported") => {
      setDataset({ items: nextItems, source });
      setLastRefreshedAt(new Date());
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({
      ...current,
      ...patch,
      riskThresholds: {
        ...current.riskThresholds,
        ...patch.riskThresholds,
      },
    }));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setReadNotificationIds((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const saveScenario = useCallback((scenario: Omit<SavedScenario, "id" | "createdAt">) => {
    setSavedScenarios((current) => [
      { ...scenario, id: createId("scenario"), createdAt: new Date().toISOString() },
      ...current,
    ]);
  }, []);

  const removeScenario = useCallback((id: string) => {
    setSavedScenarios((current) => current.filter((scenario) => scenario.id !== id));
  }, []);

  const setRecommendationAction = useCallback(
    (id: string, status: RecommendationActionStatus) => {
      setRecommendationActions((current) => ({ ...current, [id]: status }));
    },
    [],
  );

  const clearRecommendationAction = useCallback((id: string) => {
    setRecommendationActions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const addActivity = useCallback((inventoryItemId: string, description: string) => {
    const entry: ActivityEntry = {
      id: createId("activity"),
      inventoryItemId,
      description,
      createdAt: new Date().toISOString(),
      source: "local-demo",
    };
    setActivity((current) => [entry, ...current]);
  }, []);

  const value = useMemo(
    () => ({
      dataset,
      allItems,
      items,
      isLoading,
      error,
      lastRefreshedAt,
      refresh,
      addInventoryItem,
      updateInventoryItem,
      replaceInventoryItems,
      organizations: demoOrganizations,
      selectedOrganization,
      setSelectedOrganizationId,
      settings,
      updateSettings,
      readNotificationIds,
      markNotificationRead,
      savedScenarios,
      saveScenario,
      removeScenario,
      recommendationActions,
      setRecommendationAction,
      clearRecommendationAction,
      activity,
      addActivity,
    }),
    [
      dataset,
      allItems,
      items,
      isLoading,
      error,
      lastRefreshedAt,
      refresh,
      addInventoryItem,
      updateInventoryItem,
      replaceInventoryItems,
      selectedOrganization,
      settings,
      updateSettings,
      readNotificationIds,
      markNotificationRead,
      savedScenarios,
      saveScenario,
      removeScenario,
      recommendationActions,
      setRecommendationAction,
      clearRecommendationAction,
      activity,
      addActivity,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AppStateProvider>{children}</AppStateProvider>
    </ToastProvider>
  );
}
