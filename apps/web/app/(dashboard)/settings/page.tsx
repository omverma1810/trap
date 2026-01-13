"use client";

import { Settings as SettingsIcon, User, Building2, Bell, Shield, Palette } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from "@/components/ui";
import { PageTransition } from "@/components/layout";

const settingsSections = [
  { id: "profile", label: "Profile", icon: User, description: "Manage your account" },
  { id: "warehouse", label: "Warehouses", icon: Building2, description: "Location settings" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Alert preferences" },
  { id: "security", label: "Security", icon: Shield, description: "Password & 2FA" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme settings" },
];

export default function SettingsPage() {
  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Settings Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.id} 
                variant="glass" 
                padding="md" 
                hover
                className="cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 rounded-md bg-bg-elevated">
                    <Icon className="w-5 h-5 text-accent-primary" />
                  </div>
                  <p className="text-body-sm font-medium text-text-primary">{section.label}</p>
                  <p className="text-caption text-text-muted">{section.description}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Profile Settings Placeholder */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <Input label="Full Name" placeholder="Admin User" />
              <Input label="Email" placeholder="admin@trap.io" type="email" />
              <Input label="Phone" placeholder="+91 9999999999" />
              <Input label="Role" placeholder="Administrator" disabled />
            </div>
            <div className="mt-6 pt-6 border-t border-border-default">
              <Button variant="primary">Save Changes</Button>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse Settings Placeholder */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <CardTitle>Warehouse Settings</CardTitle>
            <CardDescription>Manage warehouse locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-elevated mb-4">
                <Building2 className="w-8 h-8 text-text-muted" />
              </div>
              <p className="text-body-sm text-text-secondary">
                Warehouse management will be integrated in Phase 3.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
