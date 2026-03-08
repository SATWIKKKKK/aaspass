"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { gsap } from "@/lib/gsap";
import {
  Crown, Check, TrendingUp, Eye, BarChart3, Shield,
  X, Loader2, Sparkles, Star, Gift, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const OWNER_PLANS = [
  { id: "monthly",   name: "Monthly",   price: 99,   period: "month",    popular: false },
  { id: "quarterly", name: "Quarterly", price: 249,  period: "3 months", popular: true, save: "16%" },
  { id: "yearly",    name: "Yearly",    price: 799,  period: "year",     popular: false, save: "33%" },
];

const OWNER_FEATURES = [
  { icon: TrendingUp, title: "Boosted Visibility",   desc: "Appear higher in search results" },
  { icon: Eye,        title: "Promoted Listings",    desc: "Featured badge on your services" },
  { icon: BarChart3,  title: "Advanced Analytics",   desc: "Detailed performance insights" },
  { icon: Shield,     title: "Priority Support",     desc: "Dedicated owner support line" },
  { icon: Star,       title: "Verified Badge",       desc: "Trust signal for students" },
  { icon: Sparkles,   title: "AI Recommendations",   desc: "Get recommended to matching students" },
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

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && typeof window.Razorpay !== "undefined") { resolve(true); return; }
    const script   = document.createElement("script");
    script.src     = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function OwnerPremiumModal({ open, onClose }: OwnerPremiumModalProps) {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("quarterly");
  const [processing, setProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Free launch premium — per-user data from DB
  const [freePremium, setFreePremium] = useState<FreePremiumData | null>(null);
  const [activatingFree, setActivatingFree] = useState(false);

  const isFreeEligible = freePremium?.isFreePeriod === true;

  useEffect(() => {
    if (!open) return;
    fetch("/api/payment/free-premium")
      .then((r) => r.json())
      .then((d: FreePremiumData) => setFreePremium(d))
      .catch(() => {});
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

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">🎉 You are ahead in search results now!</h2>
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

  const handleUpgrade = async () => {
    if (!session?.user) { router.push("/login"); onClose(); return; }
    setProcessing(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Failed to load payment gateway"); setProcessing(false); return; }

      const orderRes = await fetch("/api/payment/create-owner-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      if (!orderRes.ok) {
        const data = await orderRes.json();
        toast.error(data.error || "Failed to initiate payment");
        setProcessing(false);
        return;
      }
      const { orderId, amount, currency, keyId } = await orderRes.json();

      const rzp = new window.Razorpay({
        key:         keyId,
        amount,
        currency,
        order_id:    orderId,
        name:        "AasPass",
        description: `Owner Premium – ${OWNER_PLANS.find((p) => p.id === selectedPlan)?.name} Plan`,
        image:       "/logo.png",
        prefill: {
          name:  session.user.name  ?? "",
          email: session.user.email ?? "",
        },
        theme: { color: "#10B981" },
        modal: { ondismiss: () => { setProcessing(false); } },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id:  string;
          razorpay_signature:  string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payment/verify-owner", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                planId:              selectedPlan,
              }),
            });
            if (verifyRes.ok) {
              await updateSession({ isOwnerPremium: true });
              router.refresh();
              setShowSuccess(true);
            } else {
              const data = await verifyRes.json();
              toast.error(data.error || "Payment verification failed");
            }
          } catch {
            toast.error("Verification error. Contact support.");
          } finally {
            setProcessing(false);
          }
        },
      });

      rzp.on("payment.failed", (resp: { error: { description: string } }) => {
        toast.error(resp.error.description || "Payment failed");
        setProcessing(false);
      });

      rzp.open();
    } catch {
      toast.error("Something went wrong");
      setProcessing(false);
    }
  };

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

          {/* Free Launch Offer Banner */}
          {isFreeEligible && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-5 w-5 text-green-600" />
                <p className="text-sm font-bold text-green-800">FREE for your first 3 months!</p>
              </div>
              <p className="text-xs text-green-700 text-center">
                All owner premium features at <span className="font-bold">₹0</span> — original prices apply after your free period ends
                {expiryLabel && <> on <span className="font-semibold">{expiryLabel}</span></>}.
              </p>
              {freePremium.daysRemaining > 0 && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <CalendarClock className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs font-semibold text-green-700">
                    {freePremium.daysRemaining} day{freePremium.daysRemaining !== 1 ? "s" : ""} left to claim
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Plan Selection — selectable during free period too */}
          <div className="space-y-2">
            {OWNER_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={cn(
                  "w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer",
                  selectedPlan === plan.id
                    ? isFreeEligible
                      ? "border-green-500 bg-green-50/60"
                      : "border-emerald-500 bg-emerald-50/60"
                    : "border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                    selectedPlan === plan.id
                      ? isFreeEligible ? "border-green-500" : "border-emerald-500"
                      : "border-gray-300"
                  )}>
                    {selectedPlan === plan.id && (
                      <div className={cn("h-2 w-2 rounded-full", isFreeEligible ? "bg-green-500" : "bg-emerald-500")} />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{plan.name}</span>
                      {plan.popular && !isFreeEligible && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Best Value</Badge>}
                      {plan.popular && isFreeEligible && <Badge className="bg-green-100 text-green-700 text-[10px]">FREE</Badge>}
                      {!isFreeEligible && plan.save && <span className="text-[10px] text-emerald-600 font-medium">Save {plan.save}</span>}
                    </div>
                    <p className="text-xs text-gray-500">Billed per {plan.period}</p>
                  </div>
                </div>
                {isFreeEligible ? (
                  <div className="text-right">
                    <span className="text-sm text-gray-400 line-through">₹{plan.price}</span>
                    <span className="text-lg font-bold text-green-600 ml-2">₹0</span>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-gray-900">₹{plan.price}</span>
                )}
              </button>
            ))}
          </div>

          {/* CTA Button — free activation or paid upgrade */}
          {isFreeEligible ? (
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
          ) : (
            <Button
              className="w-full h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              onClick={handleUpgrade}
              disabled={processing}
            >
              {processing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><Crown className="h-4 w-4 mr-2" />Upgrade to Owner Premium – ₹{OWNER_PLANS.find(p => p.id === selectedPlan)?.price}</>
              )}
            </Button>
          )}

          <p className="text-[10px] text-gray-400 text-center">
            {isFreeEligible
              ? "No payment required · Premium features free until " + (expiryLabel ?? "end of free period")
              : "Secured by Razorpay • Cancel anytime • GST inclusive"}
          </p>
        </div>
      </div>
    </div>
  );
}
