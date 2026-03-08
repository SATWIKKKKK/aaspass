"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { gsap } from "@/lib/gsap";
import {
  Crown, Check, TrendingUp, Eye, BarChart3, Shield,
  X, Loader2, Star, Gift, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const OWNER_FEATURES = [
  { icon: TrendingUp, title: "Boosted Visibility",   desc: "Appear higher in search results" },
  { icon: Eye,        title: "Promoted Listings",    desc: "Featured badge on your services" },
  { icon: BarChart3,  title: "Advanced Analytics",   desc: "Detailed performance insights" },
  { icon: Shield,     title: "Priority Support",     desc: "Dedicated owner support line" },
  { icon: Star,       title: "Verified Badge",       desc: "Trust signal for students" },
  { icon: Crown,      title: "AI Recommendations",   desc: "Get recommended to matching students" },
];

interface FreePremiumData {
  isFreePeriod: boolean;
  alreadyClaimed: boolean;
  daysRemaining: number;
  freeQuotaExpiryDate: string;
  isWithinFreeQuota: boolean;
}

interface OwnerPremiumModalProps {
  open: boolean;
  onClose: () => void;
}

export function OwnerPremiumModal({ open, onClose }: OwnerPremiumModalProps) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Free launch premium — per-user data from DB
  const [freePremium, setFreePremium] = useState<FreePremiumData | null>(null);
  const [activatingFree, setActivatingFree] = useState(false);
  const [checkingFree, setCheckingFree] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCheckingFree(true);
    fetch("/api/payment/free-premium")
      .then((r) => r.json())
      .then((d: FreePremiumData) => setFreePremium(d))
      .catch(() => {})
      .finally(() => setCheckingFree(false));
  }, [open]);

  const handleActivateFree = async () => {
    setActivatingFree(true);
    try {
      const res = await fetch("/api/payment/free-premium", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await updateSession({ isOwnerPremium: true });
      router.refresh();
      setShowSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to activate free premium";
      toast.error(message);
    } finally {
      setActivatingFree(false);
    }
  };

  // GSAP entrance animation
  useEffect(() => {
    if (!open || !modalRef.current || !backdropRef.current) return;
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
    gsap.fromTo(modalRef.current, { opacity: 0, scale: 0.92, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.4)" });
  }, [open]);

  if (!open && !showSuccess) return null;

  // Show loading spinner while checking free eligibility
  if (checkingFree) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-10 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-green-600 to-green-800 flex items-center justify-center shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Checking your premium eligibility…</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You are ahead in search results now!</h2>
          <p className="text-gray-600 mb-6">Your services will be shown on top whenever students search in your area. Enjoy boosted visibility and more bookings!</p>
          <Button onClick={() => { setShowSuccess(false); onClose(); router.push("/admin/dashboard"); router.refresh(); }} className="w-full bg-green-700 hover:bg-green-800">
            Go to Dashboard
          </Button>
        </div>
      </div>
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

        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-t-2xl p-6 pb-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Owner Premium</h2>
          <p className="text-sm text-gray-600 mt-1">
            Boost your visibility, get more bookings, and grow your business
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            {OWNER_FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50">
                <f.icon className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-900">{f.title}</p>
                  <p className="text-[10px] text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Free Premium Offer Banner */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="h-5 w-5 text-green-600" />
              <p className="text-sm font-bold text-green-800">FREE Owner Premium — ₹0</p>
            </div>
            <p className="text-xs text-green-700 text-center">
              All owner premium features completely free — boosted visibility, verified badge, analytics & more!
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
            className="w-full h-12 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            onClick={handleActivateFree}
            disabled={activatingFree}
          >
            {activatingFree ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Activating...</>
            ) : (
              <><Gift className="h-4 w-4 mr-2" />Activate Free Owner Premium — ₹0</>
            )}
          </Button>

          <p className="text-[10px] text-gray-400 text-center">
            No payment required · Instant activation
          </p>
        </div>
      </div>
    </div>
  );
}
