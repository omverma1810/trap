"use client";

import * as React from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Package,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  markNotificationsRead,
  Notification,
} from "@/services/notifications.service";

interface NotificationBellProps {
  className?: string;
}

const NOTIFICATION_TYPE_ICONS: Record<string, React.ReactNode> = {
  LOW_STOCK: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  RESTOCK_REMINDER: <Package className="w-4 h-4 text-blue-500" />,
  SALE_COMPLETED: <ShoppingCart className="w-4 h-4 text-green-500" />,
  PO_RECEIVED: <Truck className="w-4 h-4 text-purple-500" />,
  SYSTEM: <Bell className="w-4 h-4 text-gray-500" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "border-l-red-500",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-amber-500",
  LOW: "border-l-green-500",
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and every 30 seconds
  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark single notification as read
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationsRead([id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const result = await markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(result.unread_count);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2.5 rounded-lg",
          "bg-white/[0.05] border border-white/[0.08]",
          "text-[#A1A4B3] hover:bg-white/[0.08] hover:text-[#F5F6FA]",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A15B]",
        )}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5 stroke-[1.5]" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -top-1 -right-1",
              "flex items-center justify-center",
              "min-w-[18px] h-[18px] px-1",
              "text-xs font-semibold text-white",
              "bg-red-500 rounded-full",
              "ring-2 ring-[#0E0F13]",
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2",
            "w-96 max-h-[480px]",
            "bg-[#1A1B21] border border-white/[0.08] rounded-xl",
            "shadow-xl shadow-black/20",
            "overflow-hidden",
            "z-50",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
            <h3 className="text-sm font-semibold text-[#F5F6FA]">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-[#C6A15B] hover:text-[#D4B06A] transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[380px]">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Bell className="w-10 h-10 text-[#3A3D4A] mb-2" />
                <p className="text-sm text-[#6F7285]">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3",
                      "border-l-2",
                      PRIORITY_COLORS[notification.priority] ||
                        "border-l-transparent",
                      !notification.is_read && "bg-white/[0.02]",
                      "hover:bg-white/[0.04] transition-colors cursor-pointer",
                    )}
                    onClick={() =>
                      !notification.is_read && handleMarkRead(notification.id)
                    }
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {NOTIFICATION_TYPE_ICONS[
                        notification.notification_type
                      ] || <Bell className="w-4 h-4 text-gray-500" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          notification.is_read
                            ? "text-[#A1A4B3]"
                            : "text-[#F5F6FA]",
                        )}
                      >
                        {notification.title}
                      </p>
                      <p className="text-xs text-[#6F7285] mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      {notification.notification_type === "LOW_STOCK" && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                            Stock: {notification.current_stock}/
                            {notification.threshold}
                          </span>
                          {notification.warehouse_name && (
                            <span className="text-xs text-[#6F7285]">
                              {notification.warehouse_name}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-[#4A4D5A] mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>

                    {/* Read indicator */}
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-[#C6A15B]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-white/[0.08]">
              <a
                href="/settings/notifications"
                className="block text-center text-xs text-[#C6A15B] hover:text-[#D4B06A] transition-colors"
              >
                Notification Settings
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
