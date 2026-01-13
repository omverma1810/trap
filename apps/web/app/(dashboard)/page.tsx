"use client";

import { 
  Package, 
  ShoppingCart, 
  FileText, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Badge } from "@/components/ui";
import { PageTransition } from "@/components/layout";

const stats = [
  {
    label: "Total Products",
    value: "1,247",
    change: "+12%",
    trend: "up",
    icon: Package,
  },
  {
    label: "Today's Sales",
    value: "₹24,500",
    change: "+8%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    label: "Pending Invoices",
    value: "23",
    change: "-5%",
    trend: "down",
    icon: FileText,
  },
  {
    label: "Monthly Revenue",
    value: "₹4,85,000",
    change: "+18%",
    trend: "up",
    icon: TrendingUp,
  },
];

export default function DashboardPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} variant="glass" padding="md">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-body-sm text-text-secondary">{stat.label}</p>
                    <p className="numeric-lg">{stat.value}</p>
                    <div className="flex items-center gap-1">
                      {stat.trend === "up" ? (
                        <ArrowUpRight className="w-4 h-4 text-success" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-danger" />
                      )}
                      <span className={`text-caption ${stat.trend === "up" ? "text-success" : "text-danger"}`}>
                        {stat.change}
                      </span>
                      <span className="text-caption text-text-muted">vs last month</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-accent-primary/10">
                    <Icon className="w-5 h-5 text-accent-primary" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="glass" padding="lg">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Sale completed", detail: "₹1,250 • 3 items", time: "2 min ago", status: "success" },
                  { action: "Invoice generated", detail: "INV-2026-0042", time: "15 min ago", status: "neutral" },
                  { action: "Low stock alert", detail: "Blue Denim Jacket", time: "1 hour ago", status: "warning" },
                  { action: "New product added", detail: "Premium T-Shirt", time: "3 hours ago", status: "accent" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
                    <div>
                      <p className="text-body-sm text-text-primary">{item.action}</p>
                      <p className="text-caption text-text-muted">{item.detail}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={item.status as "success" | "warning" | "neutral" | "accent"} size="sm">
                        {item.time}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" padding="lg">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "New Sale", icon: ShoppingCart, href: "/pos" },
                  { label: "Add Product", icon: Package, href: "/inventory" },
                  { label: "View Invoices", icon: FileText, href: "/invoices" },
                  { label: "Analytics", icon: TrendingUp, href: "/analytics" },
                ].map((action) => {
                  const Icon = action.icon;
                  return (
                    <a
                      key={action.label}
                      href={action.href}
                      className="flex items-center gap-3 p-4 rounded-md bg-bg-elevated border border-border-default hover:border-border-hover transition-colors"
                    >
                      <Icon className="w-5 h-5 text-accent-primary" />
                      <span className="text-body-sm text-text-primary">{action.label}</span>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
