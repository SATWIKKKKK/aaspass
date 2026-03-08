"use client";

import { useState, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Crown, Zap, Shield, MessageSquare, Gift, Clock, Star,
  X, Loader2, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumSuccessPopup } from "@/components/premium-success-popup";

const FEATURES = [
  { icon: MessageSquare, title: "AI Chat Assistant", desc: "Smart service search" },
  { icon: Zap,           title: "Priority Booking",  desc: "Book before others" },
  { icon: Shield,        title: "Late Fee Waiver",    desc: "No late charges" },
  { icon: Gift,          title: "2x SuperCoins",      desc: "Double rewards" },
  { icon: Clock,         title: "24/7 Support",        desc: "Priority help" },
  { icon: Star,          title: "Exclusive Deals",     desc: "Members-only offers" },
];

interface FreePremiumData {
  isFreePeriod: boolean;
  alreadyClaimed: boolean;
  daysRemaining: number;
  freeQuotaExpiryDate: string;
  isWithinFreeQuota: boolean;
}

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [successData, setSuccessData] = useState<{ premiumExpiry: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const isPremium = (session?.user as { isPremium?: boolean })?.isPremium;

  // Free launch premium — per-user data from DB
  const [freePremium, setFreePremium] = useState<FreePremiumData | null>(null);
  const [activatingFree, setActivatingFree] = useState(false);
  const [checkingFree, setCheckingFree] = useState(false);

  useEffect(() => {
    if (!open || isPremium) return;
    setCheckingFree(true);
    fetch("/api/payment/free-premium")
      .then((r) => r.json())
      .then((d: FreePremiumData) => setFreePremium(d))
      .catch(() => {})
      .finally(() => setCheckingFree(false));
  }, [open, isPremium]);

  const handleActivateFree = async () => {
    setActivatingFree(true);
    try {
      const res = await fetch("/api/payment/free-premium", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await updateSession({ isPremium: true });
      router.refresh();
      setSuccessData({ premiumExpiry: data.premiumExpiry });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to activate free premium";
      toast.error(message);
    } finally {
      setActivatingFree(false);
    }
  };

  // GSAP entrance animation when modal opens
  useEffect(() => {
    if (!open || !modalRef.current || !backdropRef.current) return;
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
    gsap.fromTo(modalRef.current, { opacity: 0, scale: 0.92, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.4)" });
  }, [open]);

  if (!open && !successData) return null;

  // Show loading spinner while checking free eligibility
  if (checkingFree) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-10 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Checking your premium eligibility…</p>
        </div>
      </div>
    );
  }

  // Show success popup over everything
  if (successData) {
    return (
      <PremiumSuccessPopup
        premiumExpiry={successData.premiumExpiry}
        onClose={() => {
          setSuccessData(null);
          onClose();
        }}
      />
    );
  }

  const expiryLabel = freePremium?.freeQuotaExpiryDate
    ? new Date(freePremium.freeQuotaExpiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div ref={backdropRef} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} style={{ opacity: 0 }} />
      <div ref={modalRef} className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ opacity: 0 }}>
        <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center z-10 transition-colors">
          <X className="h-4 w-4 text-gray-500" />
        </button>

        <div className="bg-linear-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-t-2xl p-6 pb-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isPremium ? "You are Premium! 👑" : "Unlock AasPass Premium"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isPremium ? "Enjoying all premium benefits" : "AI search, priority booking & more"}
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{f.title}</p>
                  <p className="text-[10px] text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {isPremium ? (
            <div className="text-center space-y-3">
              <Button onClick={() => { router.push("/chat"); onClose(); }} className="w-full bg-primary hover:bg-primary/90">
                <MessageSquare className="h-4 w-4 mr-2" /> Open AI Chat
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
            </div>
          ) : (
            <>
              {/* Free Premium Offer Banner */}
              <div className="mb-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Gift className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-bold text-green-800">FREE Premium — ₹0</p>
                </div>
                <p className="text-xs text-green-700 text-center">
                  All premium features completely free — AI chat, priority booking, 2x SuperCoins & more!
                  {expiryLabel && <> Available until <span className="font-semibold">{expiryLabel}</span>.</>}
                </p>
                {freePremium && freePremium.daysRemaining > 0 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <CalendarClock className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-semibold text-green-700">
                      {freePremium.daysRemaining} day{freePremium.daysRemaining !== 1 ? "s" : ""} left to claim
                    </span>
                  </div>
                )}
              </div>

              {/* CTA Button — free activation only */}
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12"
                onClick={handleActivateFree}
                disabled={activatingFree}
              >
                {activatingFree ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4 mr-2" />
                )}
                {activatingFree ? "Activating..." : "Activate Free Premium — ₹0"}
              </Button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                No payment required · Instant activation
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
