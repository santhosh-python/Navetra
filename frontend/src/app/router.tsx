import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, lazy: async () => ({ Component: (await import("../pages/OverviewPage")).OverviewPage }) },
      { path: "inventory", lazy: async () => ({ Component: (await import("../pages/InventoryPage")).InventoryPage }) },
      { path: "forecasts", lazy: async () => ({ Component: (await import("../pages/ForecastsPage")).ForecastsPage }) },
      { path: "recommendations", lazy: async () => ({ Component: (await import("../pages/RecommendationsPage")).RecommendationsPage }) },
      { path: "simulator", lazy: async () => ({ Component: (await import("../pages/SimulatorPage")).SimulatorPage }) },
      { path: "analytics", lazy: async () => ({ Component: (await import("../pages/AnalyticsPage")).AnalyticsPage }) },
      { path: "reports", lazy: async () => ({ Component: (await import("../pages/ReportsPage")).ReportsPage }) },
      { path: "settings", lazy: async () => ({ Component: (await import("../pages/SettingsPage")).SettingsPage }) },
      { path: "items/:itemId", lazy: async () => ({ Component: (await import("../pages/ItemDetailPage")).ItemDetailPage }) },
      { path: "*", lazy: async () => ({ Component: (await import("../pages/NotFoundPage")).NotFoundPage }) },
    ],
  },
]);
