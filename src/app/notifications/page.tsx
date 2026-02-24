"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Bell, Check, CheckCheck, Loader2, BellOff, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

interface NotificationData {
  id: string; title: string; message: string; isRead: boolean; link: string | null; createdAt: string;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/notifications").then((r) => r.json()).then((data) => setNotifications(data.notifications || []))
      .catch(() => toast.error("Failed to load notifications")).finally(() => setLoading(false));
  }, [status]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
      if (res.ok) setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { toast.error("Failed to update"); }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) { await markAsRead(n.id); }
    toast.success("All marked as read");
  };

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant={(session?.user as any)?.role === "OWNER" ? "admin" : "student"} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3"><Bell className="h-8 w-8 text-primary" />Notifications</h1><p className="text-gray-500 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}</p></div>
          {unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllAsRead}><CheckCheck className="h-4 w-4 mr-1" /> Mark all read</Button>}
        </div>

        {notifications.length === 0 ? (
          <Card><CardContent className="p-12 text-center"><BellOff className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3><p className="text-gray-500">You&apos;re all caught up!</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card key={notification.id} className={cn("transition-all cursor-pointer", notification.isRead ? "bg-white" : "bg-blue-50/50 border-blue-200")}
                onClick={() => { if (!notification.isRead) markAsRead(notification.id); if (notification.link) router.push(notification.link); }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("h-2.5 w-2.5 rounded-full mt-2 flex-shrink-0", notification.isRead ? "bg-gray-200" : "bg-blue-500")} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn("font-medium", notification.isRead ? "text-gray-700" : "text-gray-900")}>{notification.title}</h3>
                        <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(notification.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {notification.link && <span className="text-xs text-primary inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> View Details</span>}
                        {!notification.isRead && <button onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }} className="text-xs text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"><Check className="h-3 w-3" /> Mark read</button>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
