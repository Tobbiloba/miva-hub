"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCheck,
  FileText,
  Flame,
  Layers,
  Trash2,
} from "lucide-react";
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

const TYPE_ICONS: Record<string, { icon: typeof Bell; color: string }> = {
  streak_milestone: { icon: Flame, color: "text-amber-600" },
  streak_at_risk: { icon: AlertTriangle, color: "text-amber-600" },
  course_neglected: { icon: BookOpen, color: "text-destructive" },
  flashcards_due: { icon: Layers, color: "text-primary" },
  new_content: { icon: FileText, color: "text-emerald-600" },
};

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const router = useRouter();

  const { data: allData, mutate: mutateAll } = useSWR(
    "/api/notifications?limit=50",
    fetcher,
  );

  const { data: unreadData, mutate: mutateUnread } = useSWR(
    tab === "unread" ? "/api/notifications?unread=true&limit=50" : null,
    fetcher,
  );

  const allNotifications: Notification[] = allData?.data ?? [];
  const unreadNotifications: Notification[] = unreadData?.data ?? [];
  const unreadCount: number = allData?.unreadCount ?? 0;

  const current = tab === "unread" ? unreadNotifications : allNotifications;

  const refresh = useCallback(() => {
    mutateAll();
    mutateUnread();
  }, [mutateAll, mutateUnread]);

  const markRead = useCallback(
    async (id: string, entityUrl: string | null) => {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      refresh();
      if (entityUrl) {
        router.push(entityUrl);
      }
    },
    [refresh, router],
  );

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    refresh();
  }, [refresh]);

  const deleteNotification = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      refresh();
    },
    [refresh],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Stay updated on your study activity
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {current.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  {tab === "unread" ? "All caught up" : "No notifications yet"}
                </p>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {tab === "unread"
                    ? "You've read all your notifications."
                    : "Check back as you study. Notifications will appear here."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {current.map((n) => {
                const config = TYPE_ICONS[n.type] || {
                  icon: Bell,
                  color: "text-muted-foreground",
                };
                const Icon = config.icon;

                return (
                  <Card
                    key={n.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      !n.isRead ? "border-l-2 border-l-primary" : ""
                    }`}
                    onClick={() => markRead(n.id, n.entityUrl)}
                  >
                    <CardContent className="flex items-start gap-4 py-4">
                      <div
                        className={`mt-0.5 rounded-lg p-2 shrink-0 ${
                          !n.isRead ? "bg-primary/10" : "bg-muted"
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm leading-snug ${
                            !n.isRead ? "font-semibold" : ""
                          }`}
                        >
                          {n.title}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {n.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary mr-1" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => deleteNotification(e, n.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
