"use client";

import { BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { PageTransition } from "@/components/layout";

export default function AnalyticsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: "₹4,85,000", change: "+18%", up: true },
            { label: "Total Sales", value: "847", change: "+12%", up: true },
            { label: "Average Order", value: "₹572", change: "-3%", up: false },
            { label: "Discounts Given", value: "₹24,500", change: "+5%", up: true },
          ].map((kpi) => (
            <Card key={kpi.label} variant="glass" padding="md">
              <div className="space-y-2">
                <p className="text-body-sm text-text-secondary">{kpi.label}</p>
                <p className="numeric-lg">{kpi.value}</p>
                <div className="flex items-center gap-1">
                  {kpi.up ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger" />
                  )}
                  <span className={kpi.up ? "text-success" : "text-danger"}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Chart Placeholders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="glass" padding="lg">
            <CardHeader>
              <CardTitle>Sales Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                  <BarChart3 className="w-8 h-8 text-accent-primary" />
                </div>
                <h3 className="text-heading-sm text-text-primary mb-2">Chart Placeholder</h3>
                <p className="text-body-sm text-text-secondary text-center max-w-sm">
                  Sales trend chart will be integrated in Phase 3.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card variant="glass" padding="lg">
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                  <DollarSign className="w-8 h-8 text-accent-primary" />
                </div>
                <h3 className="text-heading-sm text-text-primary mb-2">Chart Placeholder</h3>
                <p className="text-body-sm text-text-secondary text-center max-w-sm">
                  Revenue breakdown chart will be integrated in Phase 3.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Products Placeholder */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-body-sm text-text-secondary">
                Product rankings will be displayed here after API integration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
