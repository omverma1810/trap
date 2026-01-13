"use client";

import { User, Building2, Bell, Shield, Palette } from "lucide-react";
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
              <div 
                key={section.id} 
                className="p-5 rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] hover:border-[#C6A15B]/30 cursor-pointer transition-all group"
              >
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.05] group-hover:bg-[#C6A15B]/10 transition-colors">
                    <Icon className="w-5 h-5 text-[#A1A4B3] group-hover:text-[#C6A15B] stroke-[1.5] transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-[#F5F6FA]">{section.label}</p>
                  <p className="text-xs text-[#6F7285]">{section.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Profile Settings Placeholder */}
        <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA]">Profile Settings</h2>
            <p className="text-sm text-[#6F7285] mt-1">Update your personal information</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
              {[
                { label: "Full Name", value: "Admin User" },
                { label: "Email", value: "admin@trap.io" },
                { label: "Phone", value: "+91 9999999999" },
                { label: "Role", value: "Administrator", disabled: true },
              ].map((field) => (
                <div key={field.label} className="space-y-2">
                  <label className="text-sm font-medium text-[#A1A4B3]">{field.label}</label>
                  <input
                    type="text"
                    defaultValue={field.value}
                    disabled={field.disabled}
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 pt-6 border-t border-white/[0.08]">
              <button className="px-5 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Warehouse Settings Placeholder */}
        <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold text-[#F5F6FA]">Warehouse Settings</h2>
            <p className="text-sm text-[#6F7285] mt-1">Manage warehouse locations</p>
          </div>
          <div className="px-6 py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/[0.05] mb-4">
                <Building2 className="w-8 h-8 text-[#6F7285] stroke-[1.5]" />
              </div>
              <p className="text-sm text-[#A1A4B3]">
                Warehouse management will be integrated in Phase 3.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
