"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: "INFO" | "WARNING" | "ERROR";
  title: string;
  message: string;
  isRead: boolean;
  workflowId: string | null;
  executionId: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

function getTypeStyles(type: NotificationItem["type"]) {
  switch (type) {
    case "ERROR":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "WARNING":
      return "border-amber-400/20 bg-amber-400/10 text-amber-300";
    default:
      return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  }
}

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const json = (await response.json()) as {
        data?: NotificationsResponse;
      };

      setNotifications(json.data?.notifications ?? []);
      setUnreadCount(json.data?.unreadCount ?? 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      setUnreadCount(0);
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          isRead: true,
        }))
      );
    } catch {
      return;
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const clearNotifications = async () => {
    try {
      await fetch("/api/notifications/clear", {
        method: "DELETE",
      });
  
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      return;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);

          if (nextOpen) {
            void loadNotifications();
          }
        }}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-14 z-50 w-[380px] rounded-3xl border border-white/10 bg-[#0b1728] p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
  <div>
    <h3 className="text-sm font-semibold text-white">Уведомления</h3>
    <p className="text-xs text-white/45">
      Последние события по executions
    </p>
  </div>

  <div className="flex items-center gap-3">
    <button
      type="button"
      onClick={() => void markAllAsRead()}
      className="text-xs text-cyan-300 transition hover:text-cyan-200"
    >
      Прочитать все
    </button>

    <button
      type="button"
      onClick={() => void clearNotifications()}
      className="text-xs text-red-300 transition hover:text-red-200"
    >
      Очистить
    </button>
  </div>
</div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                Загрузка уведомлений...
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => {
                const href = notification.executionId
                  ? `/executions/${notification.executionId}`
                  : notification.workflowId
                    ? `/executions?workflowId=${notification.workflowId}`
                    : "/executions";

                return (
                  <Link
                    key={notification.id}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] ${getTypeStyles(notification.type)}`}
                      >
                        {notification.type}
                      </span>

                      {!notification.isRead ? (
                        <span className="text-[10px] text-cyan-300">NEW</span>
                      ) : null}
                    </div>

                    <p className="text-sm font-medium text-white">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs text-white/55">
                      {notification.message}
                    </p>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-white/45">
                Уведомлений пока нет
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}