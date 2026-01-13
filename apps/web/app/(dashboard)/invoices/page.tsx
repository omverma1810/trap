"use client";

import { FileText, Plus, Download, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";
import { PageTransition } from "@/components/layout";

export default function InvoicesPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="md">
              <Filter className="w-4 h-4" /> Filter
            </Button>
            <Button variant="secondary" size="md">
              <Download className="w-4 h-4" /> Export
            </Button>
          </div>
          <Button variant="primary">
            <Plus className="w-4 h-4" /> New Invoice
          </Button>
        </div>

        {/* Invoice Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Invoices", value: "1,247", badge: null },
            { label: "Paid", value: "1,180", badge: "success" },
            { label: "Pending", value: "45", badge: "warning" },
            { label: "Overdue", value: "22", badge: "danger" },
          ].map((stat) => (
            <Card key={stat.label} variant="glass" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-text-muted">{stat.label}</p>
                  <p className="numeric text-heading-sm">{stat.value}</p>
                </div>
                {stat.badge && (
                  <Badge variant={stat.badge as "success" | "warning" | "danger"} dot>
                    {stat.badge}
                  </Badge>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Invoice List Placeholder */}
        <Card variant="glass" padding="none">
          <CardHeader className="px-6 pt-6">
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                <FileText className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-heading-sm text-text-primary mb-2">Invoice List</h3>
              <p className="text-body-sm text-text-secondary max-w-md mx-auto">
                This is a placeholder for the invoice list. 
                Data tables will be added in Phase 3.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
