"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "@/lib/gsap";
import {
  Crown, TrendingUp, Eye, BarChart3, Shield,
  X, Loader2, Star, Gift, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumSuccessPopup } from "@/components/premium-success-popup";
import { usePremiumFlow, type PlanId } from "@/hooks/use-premium-flow";

const OWNER_FEATURES = [
  { icon: TrendingUp, title: "Boosted Visibility",  desc: "Appear higher in search results" },
  { icon: Eye,        title: "Promoted Listings",   desc: "Featured badge on your services" },
  { icon: BarChart3,  title: "Advanced Analytics",  desc: "Detailed performance insights" },
  { icon: Shield,     title: "Priority Support",    desc: "Dedicated owner support line" },
  { icon: Star,       title: "Verified Badge",      desc: "Trust signal for students" },
  { icon: Crown,      title: "AI Recommendations",  desc: "Get recommended to matching students" },
];

const PLANS: { id: PlanId; label: string; price: number; per: string; days: number; badge?: string }[] = [
  { id: "monthly",   label: "Monthly",   price: 99,  per: "/mo",  days: 30 },
  { id: "quarterly", label: "Quarterly", price: 249, per: "/qtr", days: 90,  badge: "POPULAR" },
  { id: "yearly",    label: "Yearly",    price: 799, per: "/yr",  days: 365, badge: "BEST VALUE" },
];

interface OwnerPremiumModalProps {
  open: boolean;
  onClose: () => void;
}

export function OwnerPremiumModal({ open, onClose }: OwnerPremiumModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const {
    state, freeData, selectedPlan, setSelectedPlan,
    premiumExpiry, activateFree, startPaidFlow, reset,
  } = usePremiumFlow(open, "owner");

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

  // ── Checking eligibility ──
  if (state === "checking") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-10 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-gray-400">Checking your premium eligibility…</p>
        </div>
      </div>
    );
  }

  // ── Processing ──
  if (state === "processing") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-10 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 font-medium">Activating your premium…</p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (state === "success" && premiumExpiry) {
    return (
      <PremiumSuccessPopup
        premiumExpiry={premiumExpiry}
        variant="owner"
        onClose={handleClose}
      />
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
        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-t-2xl p-6 pb-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Owner Premium</h2>
          <p className="text-sm text-gray-600 mt-1">
            Boost your visibility, get more bookings, and grow your business
          </p>
        </div>

        <div className="p-6">
          {/* Features */}
          <div className="grid grid-cols-2 gap-3 mb-6">
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

          {/* Free banner (only in free mode) */}
          {isFreeMode && (
            <div className="mb-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Gift className="h-4 w-4 text-green-600" />
                <p className="text-sm font-bold text-green-800">FREE Owner Premium — ₹0</p>
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
                      ? "border-emerald-500 bg-emerald-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"
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
                className="w-full h-12 text-base bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                onClick={activateFree}
                disabled={!selectedPlan}
              >
                <Gift className="h-4 w-4 mr-2" />
                Activate Free Owner Premium — ₹0
              </Button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                No payment required · Instant activation
              </p>
            </>
          ) : (
            <>
              <Button
                className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
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
              className="w-full mt-3 text-xs text-emerald-600 hover:underline text-center"
            >
              Something went wrong — tap to retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
