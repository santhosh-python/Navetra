import { Suspense, lazy, type ComponentType, type ReactElement } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProviders } from './providers';
import { AppShell } from '../components/layout/AppShell';
import { LoadingState } from '../components/common/EmptyState';
import { OverviewPage } from '../pages/OverviewPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// Pages are loaded on demand so the chart library is only downloaded when a chart page is opened.
const InventoryPage = lazyPage(() => import('../pages/InventoryPage'), 'InventoryPage');
const ItemDetailPage = lazyPage(() => import('../pages/ItemDetailPage'), 'ItemDetailPage');
const ForecastsPage = lazyPage(() => import('../pages/ForecastsPage'), 'ForecastsPage');
const RecommendationsPage = lazyPage(() => import('../pages/RecommendationsPage'), 'RecommendationsPage');
const SimulatorPage = lazyPage(() => import('../pages/SimulatorPage'), 'SimulatorPage');
const AnalyticsPage = lazyPage(() => import('../pages/AnalyticsPage'), 'AnalyticsPage');
const ReportsPage = lazyPage(() => import('../pages/ReportsPage'), 'ReportsPage');
const SettingsPage = lazyPage(() => import('../pages/SettingsPage'), 'SettingsPage');
const ResearchDataPage = lazyPage(() => import('../pages/ResearchDataPage'), 'ResearchDataPage');

function lazyPage(loader: () => Promise<Record<string, ComponentType>>, name: string) {
  const Component = lazy(async () => {
    const module = await loader();
    return { default: module[name] };
  });
  return function LazyPage(): ReactElement {
    return (
      <Suspense fallback={<LoadingState label="Loading page" />}>
        <Component />
      </Suspense>
    );
  };
}

/**
 * Route table. Every page sits inside AppShell so navigation, data notices and notifications
 * are always present. BrowserRouter needs the host to serve index.html for unknown paths (see DEVELOPMENT.md).
 */
export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/:itemId" element={<ItemDetailPage />} />
            <Route path="forecasts" element={<ForecastsPage />} />
            <Route path="recommendations" element={<RecommendationsPage />} />
            <Route path="simulator" element={<SimulatorPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="research-data" element={<ResearchDataPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  );
}
