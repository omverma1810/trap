"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar, TopBar } from "@/components/layout";

const routeTitles: Record<string, { title: string; subtitle?: string; showWarehouse?: boolean; showDateRange?: boolean }> = {
  "/": { title: "Dashboard", subtitle: "Overview of your business" },
  "/inventory": { title: "Inventory", subtitle: "Manage products and stock", showWarehouse: true },
  "/analytics": { title: "Analytics", subtitle: "Business insights", showDateRange: true },
  "/invoices": { title: "Invoices", subtitle: "Billing and receipts" },
  "/settings": { title: "Settings", subtitle: "System configuration" },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Get route config
  const routeConfig = routeTitles[pathname] || { title: "Page" };

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle responsive collapse
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0E0F13]">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar
          title={routeConfig.title}
          subtitle={routeConfig.subtitle}
          onMenuClick={() => setMobileOpen(true)}
          showWarehouseSelector={routeConfig.showWarehouse}
          showDateRange={routeConfig.showDateRange}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
