"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Users,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth";
import { useThemeStore } from "@/hooks/use-theme";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Analytics", href: "/analytics", icon: BarChart3, adminOnly: true },
  { label: "Users", href: "/users", icon: Users, adminOnly: true },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  userRole?: "ADMIN" | "STAFF" | null;
}

export function Sidebar({
  isCollapsed,
  onToggle,
  isMobileOpen = false,
  onMobileClose,
  userRole,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { theme, toggleTheme } = useThemeStore();

  // Handle escape key for mobile
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen && onMobileClose) {
        onMobileClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMobileOpen, onMobileClose]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // Filter nav items based on role
  const filteredNavItems = React.useMemo(() => {
    if (userRole === "ADMIN") return navItems;
    return navItems.filter((item) => !item.adminOnly);
  }, [userRole]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/[0.08]">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#C6A15B] flex items-center justify-center shadow-lg">
            <span className="text-[#0E0F13] font-bold text-base">T</span>
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="font-semibold text-lg text-[#F5F6FA] tracking-tight whitespace-nowrap"
            >
              TRAP
            </motion.span>
          )}
        </Link>

        {/* Mobile close button */}
        {isMobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-lg hover:bg-white/[0.05] text-[#A1A4B3] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "transition-all duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]",
                "min-h-[48px]",
                active
                  ? "bg-[#C6A15B]/15 text-[#C6A15B] border-l-[3px] border-[#C6A15B] -ml-px"
                  : "text-[#A1A4B3] hover:bg-white/[0.05] hover:text-[#F5F6FA]"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0 stroke-[1.5]",
                  active ? "text-[#C6A15B]" : ""
                )}
              />
              {!isCollapsed && (
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
              {active && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C6A15B]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-white/[0.08]">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-3 rounded-lg",
            "text-[#E74C3C] hover:bg-[#E74C3C]/10",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E74C3C]"
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
          {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-3 rounded-lg mt-1",
            "text-[#A1A4B3] hover:bg-white/[0.05] hover:text-[#F5F6FA]",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]"
          )}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
          ) : (
            <Moon className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
          )}
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>
      </div>

      {/* Collapse Toggle - Desktop only */}
      <div className="hidden lg:block p-4 border-t border-white/[0.08]">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center w-full py-2.5 px-3 rounded-lg",
            "text-[#A1A4B3] hover:bg-white/[0.05] hover:text-[#F5F6FA]",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 stroke-[1.5]" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 stroke-[1.5] mr-2" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-0 left-0 z-50 w-72 h-full bg-[#1A1B23]/95 backdrop-blur-xl border-r border-white/[0.08] lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 76 : 256 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "hidden lg:flex flex-col h-screen",
          "bg-[#1A1B23]/80 backdrop-blur-xl",
          "border-r border-white/[0.08]",
          "sticky top-0"
        )}
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
