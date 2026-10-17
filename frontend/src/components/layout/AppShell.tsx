import { useState } from "react";
import { Outlet } from "react-router-dom";
import { InventoryFormModal } from "../inventory/InventoryFormModal";
import { ImportModal } from "../inventory/ImportModal";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inventoryFormOpen, setInventoryFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className={`app-shell${sidebarCollapsed ? " app-shell--collapsed" : ""}`}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggleCollapse={() => setSidebarCollapsed((current) => !current)}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="app-main-column">
        <Topbar
          onOpenAdd={() => setInventoryFormOpen(true)}
          onOpenUpload={() => setImportOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="app-main" id="main-content">
          <Outlet />
        </main>
      </div>
      {inventoryFormOpen ? <InventoryFormModal onClose={() => setInventoryFormOpen(false)} /> : null}
      {importOpen ? <ImportModal onClose={() => setImportOpen(false)} /> : null}
    </div>
  );
}
