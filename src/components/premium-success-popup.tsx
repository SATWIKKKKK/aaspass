"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Crown, MessageSquare, Zap, Shield, Gift, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumSuccessPopupProps {
  premiumExpiry: string;
  onClose: () => void;
}

const FEATURES = [
  { icon: MessageSquare, label: "AI Chat Assistant — Ask anything about services" },
  { icon: Zap,           label: "Priority Booking — Book before others" },
  { icon: Shield,        label: "Late Fee Waiver — No late charges" },
  { icon: Gift,          label: "2x SuperCoins on every booking" },
  { icon: BarChart3,     label: "Booking Analytics & History" },
];

export function PremiumSuccessPopup({ premiumExpiry, onClose }: PremiumSuccessPopupProps) {
  const router = useRouter();

  useEffect(() => {
    // Fire confetti on mount
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#6366f1", "#f59e0b", "#10b981", "#ec4899"],
    });

    // Fire again from sides after 500ms for dramatic effect
    const timer = setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const formattedDate = new Date(premiumExpiry).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {/* Trophy with glow */}
        <div className="relative mx-auto mb-4">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-20 w-20 rounded-full bg-amber-100 animate-pulse" />
          </div>
          <div className="relative text-7xl animate-bounce">🏆</div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          You&apos;re Premium Now!
        </h1>
        <p className="text-gray-500 mb-6">
          Welcome to the premium family. Full access unlocked.
        </p>

        {/* Features list */}
        <div className="text-left space-y-3 mb-6 bg-indigo-50 rounded-xl p-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                <f.icon className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="text-sm text-gray-700">{f.label}</span>
            </div>
          ))}
        </div>

        {/* Subscription end date */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-green-700">
            📅 Active until: <strong>{formattedDate}</strong>
          </p>
        </div>

        {/* CTA Buttons */}
        <Button
          size="lg"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 mb-3"
          onClick={() => {
            onClose();
            router.push("/chat");
          }}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Start Using AI Chat
        </Button>
        <Button
          variant="ghost"
          className="w-full text-gray-500 hover:text-gray-700"
          onClick={() => {
            onClose();
            router.push("/dashboard");
          }}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
