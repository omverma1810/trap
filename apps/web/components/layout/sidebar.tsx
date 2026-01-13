"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion as motionTokens } from "@/lib/motion";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Package },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggle,
  isMobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

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

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-default">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-accent-primary flex items-center justify-center">
            <span className="text-bg-primary font-bold text-sm">T</span>
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="font-semibold text-text-primary whitespace-nowrap"
            >
              TRAP
            </motion.span>
          )}
        </Link>
        
        {/* Mobile close button */}
        {isMobileOpen && onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-md hover:bg-bg-elevated text-text-secondary"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-md",
                "transition-all duration-fast ease-smooth",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary",
                "min-h-[44px]", // Touch target
                active
                  ? "bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={cn("w-5 h-5 flex-shrink-0", active && "text-accent-primary")} />
              {!isCollapsed && (
                <span className="text-body-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
              )}
              {active && !isCollapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle - Desktop only */}
      <div className="hidden lg:block p-4 border-t border-border-default">
        <button
          onClick={onToggle}
          className={cn(
            "flex items-center justify-center w-full p-2 rounded-md",
            "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
            "transition-colors duration-fast",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span className="text-body-sm">Collapse</span>
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
            transition={{ duration: motionTokens.duration.fast }}
            className="fixed inset-0 z-40 bg-bg-overlay lg:hidden"
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
            transition={{ duration: motionTokens.duration.medium, ease: motionTokens.easing.smooth }}
            className="fixed top-0 left-0 z-50 w-64 h-full glass lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 240 }}
        transition={{ duration: motionTokens.duration.medium, ease: motionTokens.easing.smooth }}
        className={cn(
          "hidden lg:flex flex-col h-screen",
          "glass border-r border-border-default",
          "sticky top-0"
        )}
      >
        {sidebarContent}
      </motion.aside>
    </>
  );
}
