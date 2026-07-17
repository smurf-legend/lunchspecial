"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  read: boolean;
  createdAt: string;
  actor: { name: string | null };
  special: { id: string; title: string };
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000); // light polling, no infra needed
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await fetch("/api/notifications/read", { method: "POST" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  function describe(n: Notification) {
    const who = n.actor.name || "Someone";
    return n.type === "reply_to_comment"
      ? `${who} replied to your comment on "${n.special.title}"`
      : `${who} commented on your post "${n.special.title}"`;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={handleOpen} className="relative text-sm" aria-label="Notifications">
        <span className="inline-block grayscale brightness-0 invert">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-white text-orange-600 text-[10px] font-bold rounded-full px-1 min-w-[16px] text-center leading-4">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white text-gray-900 border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm p-4">No notifications yet.</p>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={`/specials/${n.special.id}`}
                  onClick={() => setOpen(false)}
                  className={`block p-3 text-sm hover:bg-gray-50 ${!n.read ? "bg-orange-50" : ""}`}
                >
                  <p>{describe(n)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
