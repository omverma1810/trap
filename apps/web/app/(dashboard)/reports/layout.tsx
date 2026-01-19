/**
 * Reports Dashboard Layout
 *
 * PHASE 17: DASHBOARDS & VISUAL ANALYTICS
 *
 * Provides:
 * - Filter context for all dashboard pages
 * - Sidebar navigation between report sections
 * - RBAC for admin-only sections
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  RotateCcw,
  DollarSign,
  ChevronRight,
} from "lucide-react";
import { DashboardFilterProvider } from "@/hooks";
import { useAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  adminOnly?: boolean;
}

const reportNavItems: NavItem[] = [
  {
    label: "Overview",
    href: "/reports",
    icon: LayoutDashboard,
    description: "Executive summary & KPIs",
  },
  {
    label: "Inventory",
    href: "/reports/inventory",
    icon: Package,
    description: "Stock levels & aging",
  },
  {
    label: "Sales",
    href: "/reports/sales",
    icon: TrendingUp,
    description: "Revenue & product performance",
  },
  {
    label: "Returns",
    href: "/reports/returns",
    icon: RotateCcw,
    description: "Refunds & adjustments",
    adminOnly: true,
  },
  {
    label: "Profit & Tax",
    href: "/reports/profit",
    icon: DollarSign,
    description: "Margins & GST",
    adminOnly: true,
  },
];

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  // Filter nav items based on role
  const filteredNavItems = React.useMemo(() => {
    if (isAdmin) return reportNavItems;
    return reportNavItems.filter((item) => !item.adminOnly);
  }, [isAdmin]);

  const isActive = (href: string) => {
    if (href === "/reports") return pathname === "/reports";
    return pathname.startsWith(href);
  };

  return (
    <DashboardFilterProvider>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <div className="sticky top-6 space-y-1">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-3">
              Reports
            </h2>

            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                    ${
                      active
                        ? "bg-[#C6A15B]/10 text-[#C6A15B]"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    }
                  `}
                >
                  <div
                    className={`p-1.5 rounded-md transition-colors ${
                      active
                        ? "bg-[#C6A15B]/20"
                        : "bg-white/5 group-hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p
                      className={`text-xs truncate ${active ? "text-[#C6A15B]/60" : "text-white/30"}`}
                    >
                      {item.description}
                    </p>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 opacity-50" />}
                </Link>
              );
            })}

            {/* Data source info */}
            <div className="mt-6 p-3 bg-white/[0.02] rounded-lg border border-white/5">
              <p className="text-xs text-white/30">
                All data derived from Phase 16 report APIs. No frontend
                calculations.
              </p>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="flex-1 min-w-0"
        >
          {children}
        </motion.div>
      </div>
    </DashboardFilterProvider>
  );
}
