"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Sidebar, TopBar } from "@/components/layout";
import { useAuth } from "@/lib/auth";

const routeTitles: Record<string, { title: string; subtitle?: string; showWarehouse?: boolean; showDateRange?: boolean; adminOnly?: boolean }> = {
  "/": { title: "Dashboard", subtitle: "Overview of your business" },
  "/inventory": { title: "Inventory", subtitle: "Manage products and stock", showWarehouse: true },
  "/analytics": { title: "Analytics", subtitle: "Business insights", showDateRange: true, adminOnly: true },
  "/invoices": { title: "Invoices", subtitle: "Billing and receipts" },
  "/settings": { title: "Settings", subtitle: "System configuration" },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, isAdmin } = useAuth();
  
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Get route config
  const routeConfig = routeTitles[pathname] || { title: "Page" };

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect STAFF from admin-only routes
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && routeConfig.adminOnly && !isAdmin) {
      router.push("/");
    }
  }, [isLoading, isAuthenticated, isAdmin, routeConfig.adminOnly, router]);

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

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E0F13]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#C6A15B] mx-auto" />
          <p className="mt-4 text-[#6F7285]">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#0E0F13]">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        userRole={user?.role}
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
          user={user}
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
