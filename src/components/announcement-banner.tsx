"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { X, Megaphone, AlertTriangle, Tag, Percent, Info } from "lucide-react";

interface BannerAnnouncement {
  id: string;
  title: string;
  message: string;
  type: "OFFER" | "UPDATE" | "WARNING" | "PROMOTION" | "COMMISSION";
  isDismissed: boolean;
}

const bannerStyles: Record<string, { bg: string; border: string; text: string; icon: typeof Megaphone }> = {
  OFFER: { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: Tag },
  UPDATE: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: Info },
  WARNING: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: AlertTriangle },
  PROMOTION: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", icon: Megaphone },
  COMMISSION: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", icon: Percent },
};

export function AnnouncementBanner() {
  const { status } = useSession();
  const [banners, setBanners] = useState<BannerAnnouncement[]>([]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchBanners = async () => {
      try {
        const res = await fetch("/api/announcements/platform");
        if (!res.ok) return;
        const data = await res.json();
        const active = (data.announcements || []).filter(
          (a: any) => !a.isDismissed && a.deliveryChannels?.includes("banner")
        );
        setBanners(active);
      } catch {
        // Silently fail for banner
      }
    };
    fetchBanners();
  }, [status]);

  const handleDismiss = async (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    try {
      await fetch("/api/announcements/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcementId: id, action: "dismiss" }),
      });
    } catch {
      // Best effort
    }
  };

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2">
      {banners.map((banner) => {
        const style = bannerStyles[banner.type] || bannerStyles.UPDATE;
        const Icon = style.icon;
        return (
          <div
            key={banner.id}
            className={`${style.bg} ${style.border} border rounded-lg px-4 py-3 flex items-start gap-3`}
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${style.text}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${style.text}`}>{banner.title}</p>
              <p className={`text-xs mt-0.5 ${style.text} opacity-80`}>{banner.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(banner.id)}
              className={`flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors ${style.text}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
