"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Megaphone, ArrowLeft, CheckCircle, AlertTriangle, Info,
  Tag, Percent, Eye, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGuard } from "@/components/route-guard";
import { formatDate } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: "OFFER" | "UPDATE" | "WARNING" | "PROMOTION" | "COMMISSION";
  targetType: string;
  createdAt: string;
  expiresAt: string | null;
  isRead: boolean;
  isDismissed: boolean;
}

const typeConfig: Record<string, { icon: typeof Megaphone; color: string; bg: string }> = {
  OFFER: { icon: Tag, color: "text-green-600", bg: "bg-green-50 border-green-200" },
  UPDATE: { icon: Info, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  WARNING: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  PROMOTION: { icon: Megaphone, color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  COMMISSION: { icon: Percent, color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
};

export default function OwnerAnnouncementsPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements/platform");
        if (!res.ok) throw new Error();
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      } catch {
        toast.error("Failed to load announcements");
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, [status]);

  const handleAction = async (announcementId: string, action: "read" | "dismiss") => {
    try {
      const res = await fetch("/api/announcements/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId, action }),
      });
      if (!res.ok) throw new Error();

      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId
            ? { ...a, isRead: true, isDismissed: action === "dismiss" ? true : a.isDismissed }
            : a
        )
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  const visible = announcements.filter((a) => !a.isDismissed);
  const unreadCount = visible.filter((a) => !a.isRead).length;

  if (status === "loading" || loading) {
    return (
      <RouteGuard allowedRole="OWNER">
        <div className="min-h-screen bg-gray-50/50">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
            <Skeleton className="h-8 w-48" />
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRole="OWNER">
      <div className="min-h-screen bg-gray-50/50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Platform Announcements</h1>
                  <p className="text-sm text-muted-foreground">Updates from AasPass administration</p>
                </div>
              </div>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} unread</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
          {visible.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No announcements right now</p>
              </CardContent>
            </Card>
          ) : (
            visible.map((ann) => {
              const cfg = typeConfig[ann.type] || typeConfig.UPDATE;
              const Icon = cfg.icon;
              return (
                <Card key={ann.id} className={`border ${!ann.isRead ? cfg.bg : ""} transition-colors`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${ann.isRead ? "bg-gray-100" : cfg.bg}`}>
                        <Icon className={`h-5 w-5 ${ann.isRead ? "text-muted-foreground" : cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className={`font-semibold ${ann.isRead ? "text-muted-foreground" : ""}`}>{ann.title}</h3>
                          <Badge variant="outline" className="text-[10px]">{ann.type}</Badge>
                          {!ann.isRead && <Badge variant="destructive" className="text-[10px]">New</Badge>}
                        </div>
                        <p className={`text-sm leading-relaxed ${ann.isRead ? "text-muted-foreground" : "text-foreground"}`}>
                          {ann.message}
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-xs text-muted-foreground">{formatDate(ann.createdAt)}</span>
                          {ann.expiresAt && (
                            <span className="text-xs text-muted-foreground">
                              Expires: {formatDate(ann.expiresAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!ann.isRead && (
                          <Button size="sm" variant="ghost" onClick={() => handleAction(ann.id, "read")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleAction(ann.id, "dismiss")}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </RouteGuard>
  );
}
