"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { MessageSquare, Zap, Shield, Gift, BarChart3, TrendingUp, Eye, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumSuccessPopupProps {
  premiumExpiry: string;
  onClose: () => void;
  variant?: "student" | "owner";
}

const STUDENT_FEATURES = [
  { icon: MessageSquare, label: "AI Chat Assistant" },
  { icon: Zap,           label: "Priority Booking" },
  { icon: Shield,        label: "Late Fee Waiver" },
  { icon: Gift,          label: "2x SuperCoins" },
  { icon: BarChart3,     label: "Booking Analytics" },
];

const OWNER_FEATURES = [
  { icon: TrendingUp, label: "Boosted Visibility" },
  { icon: Eye,        label: "Promoted Listings" },
  { icon: Star,       label: "Verified Badge" },
  { icon: BarChart3,  label: "Advanced Analytics" },
  { icon: Crown,      label: "AI Recommendations" },
];

export function PremiumSuccessPopup({ premiumExpiry, onClose, variant = "student" }: PremiumSuccessPopupProps) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const features = variant === "owner" ? OWNER_FEATURES : STUDENT_FEATURES;
  const cta = variant === "owner"
    ? { label: "Go to Dashboard", path: "/admin/dashboard" }
    : { label: "Open AI Chat", path: "/chat" };

  useEffect(() => {
    // Fire confetti
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#f59e0b", "#10b981", "#ec4899"],
    });

    // Auto-dismiss after 5 seconds
    timerRef.current = setTimeout(onClose, 5000);
    return () => clearTimeout(timerRef.current);
  }, [onClose]);

  const formattedDate = new Date(premiumExpiry).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-[400px] w-full max-h-[50vh] overflow-y-auto p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Crown */}
        <div className="text-5xl mb-2 animate-bounce">👑</div>

        <h1 className="text-xl font-black text-gray-900 mb-0.5">
          You&apos;re Premium Now!
        </h1>
        <p className="text-indigo-600 font-semibold text-sm mb-3">
          Welcome to AasPass Premium
        </p>

        {/* Features — compact row */}
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-indigo-50 rounded-full px-2.5 py-1">
              <f.icon className="h-3.5 w-3.5 text-indigo-600" />
              <span className="text-[11px] font-medium text-gray-700">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Expiry */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-4">
          <p className="text-xs text-green-700">
            📅 Active until <strong>{formattedDate}</strong>
          </p>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white h-10 shadow-lg shadow-indigo-200"
          onClick={() => {
            clearTimeout(timerRef.current);
            onClose();
            router.push(cta.path);
          }}
        >
          {cta.label}
        </Button>
      </div>
    </div>
  );
}
