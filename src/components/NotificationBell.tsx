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

// Notifications aren't urgent, so polling doesn't need to be frequent or
// constant. POLL_MS is the tick while the tab is open and someone is
// actually there; IDLE_MS stops it even in a frontmost, visible tab once
// nobody has touched the mouse or keyboard for a while — a monitor left on
// all day showing the site otherwise polls forever, since the Page
// Visibility API alone can't tell "open" apart from "actually being used."
const POLL_MS = 4 * 60_000;
const IDLE_MS = 5 * 60_000;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef(Date.now());
  const lastFetchRef = useRef(0);

  async function fetchNotifications() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
    lastFetchRef.current = Date.now();
  }

  useEffect(() => {
    fetchNotifications();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    activityEvents.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    // Catch up right away when the tab regains focus after being away for
    // longer than one poll interval, instead of waiting for the next tick.
    function handleVisibility() {
      if (!document.hidden) {
        markActive();
        if (Date.now() - lastFetchRef.current > POLL_MS) fetchNotifications();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current > IDLE_MS;
      if (!document.hidden && !idle) fetchNotifications();
    }, POLL_MS);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
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
