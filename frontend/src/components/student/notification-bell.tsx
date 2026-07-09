"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  FileText,
  Flame,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import useSWR from "swr";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  entityUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_ICONS: Record<string, typeof Bell> = {
  streak_milestone: Flame,
  streak_at_risk: AlertTriangle,
  course_neglected: BookOpen,
  flashcards_due: Layers,
  new_content: FileText,
};

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const { data: countData, mutate: mutateCount } = useSWR(
    "/api/notifications/unread-count",
    fetcher,
    { refreshInterval: 60000, dedupingInterval: 30000 },
  );

  const { data: listData, mutate: mutateList } = useSWR(
    open ? "/api/notifications?limit=5" : null,
    fetcher,
  );

  const unreadCount = countData?.count ?? 0;
  const notifications: Notification[] = listData?.data ?? [];

  const markRead = useCallback(
    async (id: string, entityUrl: string | null) => {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      mutateCount();
      mutateList();
      if (entityUrl) {
        setOpen(false);
        router.push(entityUrl);
      }
    },
    [mutateCount, mutateList, router],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markRead(n.id, n.entityUrl)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                    !n.isRead ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : ""}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t px-4 py-2">
          <Link
            href="/student/notifications"
            className="text-xs text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
