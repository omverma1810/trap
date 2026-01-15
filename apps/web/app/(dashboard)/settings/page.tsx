"use client";

import { useState, useEffect } from "react";
import {
  User,
  Building2,
  Palette,
  Check,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { PageTransition } from "@/components/layout";
import { useProfile, useUpdateProfile } from "@/hooks/use-users";
import { useAuthStore } from "@/lib/auth";
import { useWarehouses } from "@/hooks/use-inventory";
import { toast } from "sonner";

type Theme = "dark" | "light" | "system";

export default function SettingsPage() {
  const { user: authUser } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
  const updateProfile = useUpdateProfile();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Theme state
  const [theme, setTheme] = useState<Theme>("dark");

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setProfileForm((prev) => ({
        ...prev,
        name: profile.name || "",
        email: profile.email || "",
      }));
    }
  }, [profile]);

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("trap-theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === "system") {
      const systemDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      root.classList.toggle("dark", systemDark);
      root.classList.toggle("light", !systemDark);
    } else {
      root.classList.toggle("dark", newTheme === "dark");
      root.classList.toggle("light", newTheme === "light");
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("trap-theme", newTheme);
    applyTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password confirmation
    if (
      profileForm.new_password &&
      profileForm.new_password !== profileForm.confirm_password
    ) {
      toast.error("New passwords do not match");
      return;
    }

    const updateData: any = {};

    // Only include changed fields
    if (profileForm.name !== profile?.name) {
      updateData.name = profileForm.name;
    }
    if (profileForm.email !== profile?.email) {
      updateData.email = profileForm.email;
    }
    if (profileForm.new_password) {
      updateData.current_password = profileForm.current_password;
      updateData.new_password = profileForm.new_password;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      await updateProfile.mutateAsync(updateData);
      // Clear password fields on success
      setProfileForm((prev) => ({
        ...prev,
        current_password: "",
        new_password: "",
        confirm_password: "",
      }));
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F6FA]">Settings</h1>
          <p className="text-sm text-[#6F7285] mt-1">
            Manage your account and preferences
          </p>
        </div>

        {/* Profile Settings */}
        <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.08] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#C6A15B]/10">
              <User className="w-5 h-5 text-[#C6A15B]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F5F6FA]">Profile</h2>
              <p className="text-sm text-[#6F7285]">
                Update your personal information
              </p>
            </div>
          </div>
          <form onSubmit={handleProfileSubmit} className="p-6">
            {profileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#C6A15B] animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A4B3]">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, name: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A4B3]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Role (read-only) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A4B3]">
                      Role
                    </label>
                    <input
                      type="text"
                      value={authUser?.role || ""}
                      disabled
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#6F7285] cursor-not-allowed"
                    />
                  </div>

                  {/* Username (read-only) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#A1A4B3]">
                      Username
                    </label>
                    <input
                      type="text"
                      value={profile?.username || ""}
                      disabled
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#6F7285] cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Password Change Section */}
                <div className="mt-6 pt-6 border-t border-white/[0.08]">
                  <h3 className="text-sm font-semibold text-[#F5F6FA] mb-4">
                    Change Password
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#A1A4B3]">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={profileForm.current_password}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            current_password: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#A1A4B3]">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={profileForm.new_password}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            new_password: e.target.value,
                          })
                        }
                        placeholder="Min. 8 characters"
                        className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#A1A4B3]">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={profileForm.confirm_password}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            confirm_password: e.target.value,
                          })
                        }
                        placeholder="••••••••"
                        className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-[#F5F6FA] placeholder:text-[#6F7285] focus:outline-none focus:ring-2 focus:ring-[#C6A15B] focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-6 pt-6 border-t border-white/[0.08]">
                  <button
                    type="submit"
                    disabled={updateProfile.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C6A15B] text-[#0E0F13] text-sm font-medium hover:bg-[#D4B06A] transition-colors disabled:opacity-50"
                  >
                    {updateProfile.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Appearance Settings */}
        <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="px-6 py-5 border-b border-white/[0.08] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#C6A15B]/10">
              <Palette className="w-5 h-5 text-[#C6A15B]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#F5F6FA]">
                Appearance
              </h2>
              <p className="text-sm text-[#6F7285]">Customize how TRAP looks</p>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#A1A4B3]">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "light", label: "Light", icon: Sun },
                    { value: "system", label: "System", icon: Monitor },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleThemeChange(option.value)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      theme === option.value
                        ? "bg-[#C6A15B]/20 border-[#C6A15B] text-[#C6A15B]"
                        : "bg-white/[0.05] border-white/[0.08] text-[#A1A4B3] hover:bg-white/[0.08]"
                    }`}
                  >
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Warehouses (Admin only) */}
        {authUser?.role === "ADMIN" && (
          <div className="rounded-xl bg-[#1A1B23]/60 backdrop-blur-xl border border-white/[0.08] overflow-hidden">
            <div className="px-6 py-5 border-b border-white/[0.08] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#C6A15B]/10">
                <Building2 className="w-5 h-5 text-[#C6A15B]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#F5F6FA]">
                  Warehouses
                </h2>
                <p className="text-sm text-[#6F7285]">
                  Manage warehouse locations
                </p>
              </div>
            </div>
            <div className="p-6">
              {warehousesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#C6A15B] animate-spin" />
                </div>
              ) : warehouses && warehouses.length > 0 ? (
                <div className="space-y-3">
                  {warehouses.map((warehouse: any) => (
                    <div
                      key={warehouse.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#F5F6FA]">
                          {warehouse.name}
                        </p>
                        <p className="text-xs text-[#6F7285]">
                          Code: {warehouse.code}
                        </p>
                      </div>
                      <span className="text-xs text-[#6F7285]">
                        {warehouse.address || "No address"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-[#6F7285] mx-auto mb-4" />
                  <p className="text-sm text-[#A1A4B3]">
                    No warehouses configured
                  </p>
                  <p className="text-xs text-[#6F7285] mt-1">
                    Add warehouses via the Inventory module
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
