"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Crown, Zap, Shield, MessageSquare, Gift, Clock, Star,
  X, Loader2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumSuccessPopup } from "@/components/premium-success-popup";
import { usePremiumFlow, type PlanId } from "@/hooks/use-premium-flow";

const FEATURES = [
  { icon: MessageSquare, title: "AI Chat Assistant", desc: "Smart service search" },
  { icon: Zap,           title: "Priority Booking",  desc: "Book before others" },
  { icon: Shield,        title: "Late Fee Waiver",    desc: "No late charges" },
  { icon: Gift,          title: "2x SuperCoins",      desc: "Double rewards" },
  { icon: Clock,         title: "24/7 Support",       desc: "Priority help" },
  { icon: Star,          title: "Exclusive Deals",    desc: "Members-only offers" },
];

const PLANS: { id: PlanId; label: string; price: number; per: string; days: number; badge?: string }[] = [
  { id: "monthly",   label: "Monthly",   price: 99,  per: "/mo",  days: 30 },
  { id: "quarterly", label: "Quarterly", price: 249, per: "/qtr", days: 90,  badge: "POPULAR" },
  { id: "yearly",    label: "Yearly",    price: 799, per: "/yr",  days: 365, badge: "BEST VALUE" },
];

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const isPremium = (session?.user as { isPremium?: boolean })?.isPremium;

  const {
    state, freeData, selectedPlan, setSelectedPlan,
    premiumExpiry, activateFree, startPaidFlow, reset,
  } = usePremiumFlow(open, "student");

  // GSAP entrance animation
  useEffect(() => {
    if ((state !== "free_modal" && state !== "paid_modal") || !modalRef.current || !backdropRef.current) return;
    gsap.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
    gsap.fromTo(modalRef.current, { opacity: 0, scale: 0.92, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.4)" });
  }, [state]);

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open && state !== "success") return null;

  // ── Checking eligibility spinner ──
  if (state === "checking") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-10 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Checking your premium eligibility…</p>
        </div>
      </div>
    );
  }

  // ── Processing spinner ──
  if (state === "processing") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-10 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500 font-medium">Activating your premium…</p>
        </div>
      </div>
    );
  }

  // ── Success popup ──
  if (state === "success" && premiumExpiry) {
    return (
      <PremiumSuccessPopup
        premiumExpiry={premiumExpiry}
        onClose={handleClose}
      />
    );
  }

  // ── Already premium ──
  if (isPremium) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div ref={backdropRef} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div ref={modalRef} className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
          <button onClick={handleClose} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center z-10">
            <X className="h-4 w-4 text-gray-500" />
          </button>
          <div className="text-5xl mb-3">👑</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">You&apos;re Premium!</h2>
          <p className="text-sm text-gray-500 mb-5">Enjoying all premium benefits</p>
          <Button onClick={() => { router.push("/chat"); handleClose(); }} className="w-full bg-primary hover:bg-primary/90">
            <MessageSquare className="h-4 w-4 mr-2" /> Open AI Chat
          </Button>
        </div>
      </div>
    );
  }

  // ── Determine mode ──
  const isFreeMode = state === "free_modal";

  const expiryLabel = freeData?.freeQuotaExpiryDate
    ? new Date(freeData.freeQuotaExpiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div ref={backdropRef} className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} style={{ opacity: 0 }} />
      <div ref={modalRef} className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ opacity: 0 }}>
        <button onClick={handleClose} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center z-10 transition-colors">
          <X className="h-4 w-4 text-gray-500" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-t-2xl p-6 pb-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Unlock AasPass Premium</h2>
          <p className="text-sm text-gray-600 mt-1">AI search, priority booking & more</p>
        </div>

        <div className="p-6">
          {/* Features grid */}
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

          {/* Free banner (only in free mode) */}
          {isFreeMode && (
            <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-green-600" />
                <p className="text-sm font-bold text-green-800">FREE Premium — ₹0</p>
              </div>
              <p className="text-xs text-green-700">
                All plans free during your launch period
                {expiryLabel && <> (until <span className="font-semibold">{expiryLabel}</span>)</>}
                {freeData && freeData.daysRemaining > 0 && (
                  <> · <span className="font-semibold">{freeData.daysRemaining} day{freeData.daysRemaining !== 1 ? "s" : ""} left</span></>
                )}
              </p>
            </div>
          )}

          {/* Plan Cards */}
          <div className="space-y-2.5 mb-5">
            {PLANS.map((plan) => {
              const selected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all text-left ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
                    }`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{plan.label}</span>
                        {plan.badge && (
                          <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                            {plan.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">{plan.days} days</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isFreeMode ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 line-through">₹{plan.price}</span>
                        <span className="text-lg font-bold text-green-600">₹0</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-gray-900">₹{plan.price}<span className="text-xs font-normal text-gray-500">{plan.per}</span></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA Button */}
          {isFreeMode ? (
            <>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12"
                onClick={activateFree}
                disabled={!selectedPlan}
              >
                <Gift className="h-4 w-4 mr-2" />
                Activate Free Premium — ₹0
              </Button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                No payment required · Instant activation
              </p>
            </>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-12"
                onClick={startPaidFlow}
                disabled={!selectedPlan}
              >
                <Crown className="h-4 w-4 mr-2" />
                {selectedPlan
                  ? `Subscribe — ₹${PLANS.find((p) => p.id === selectedPlan)?.price ?? ""}`
                  : "Select a plan to continue"}
              </Button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Secure payment via Razorpay · Cancel anytime
              </p>
            </>
          )}

          {/* Error recovery */}
          {state === "error" && (
            <button
              onClick={() => window.location.reload()}
              className="w-full mt-3 text-xs text-indigo-600 hover:underline text-center"
            >
              Something went wrong — tap to retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
