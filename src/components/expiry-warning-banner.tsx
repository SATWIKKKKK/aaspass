"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

/**
 * Shows a warning banner when premium subscription is expiring within 3 days.
 * Fetches real-time status from the server (never trusts local session).
 */
export function ExpiryWarningBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isPremium = (session?.user as { isPremium?: boolean })?.isPremium;

  useEffect(() => {
    if (!session?.user || !isPremium) return;

    fetch("/api/check-premium")
      .then((r) => r.json())
      .then((data) => {
        if (data.allowed && data.premiumExpiry) {
          const days = Math.ceil(
            (new Date(data.premiumExpiry).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          );
          if (days <= 3 && days > 0) {
            setDaysLeft(days);
          }
        }
      })
      .catch(() => {});
  }, [session, isPremium]);

  if (!daysLeft || dismissed) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Your premium subscription expires in{" "}
          <strong>
            {daysLeft} day{daysLeft > 1 ? "s" : ""}
          </strong>
          .
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => router.push("/dashboard")}
          className="underline font-semibold hover:text-amber-900 transition-colors"
        >
          Renew Now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-400 hover:text-amber-600 text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
