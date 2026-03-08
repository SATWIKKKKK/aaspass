"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

/* ── Types ─────────────────────────────────────────────── */

export type FlowState =
  | "idle"
  | "checking"
  | "free_modal"
  | "paid_modal"
  | "processing"
  | "success"
  | "error";

export interface FreePremiumData {
  isFreePeriod: boolean;
  alreadyClaimed: boolean;
  daysRemaining: number;
  freeQuotaExpiryDate: string;
  isWithinFreeQuota: boolean;
  registeredAt: string;
}

export type PlanId = "monthly" | "quarterly" | "yearly";

/* ── Razorpay script loader ────────────────────────────── */

let razorpayLoaded = false;
function loadRazorpay(): Promise<void> {
  if (razorpayLoaded || typeof window === "undefined") return Promise.resolve();
  if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
    razorpayLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => {
      razorpayLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.head.appendChild(s);
  });
}

/* ── Hook ──────────────────────────────────────────────── */

export function usePremiumFlow(
  open: boolean,
  variant: "student" | "owner",
) {
  const { update: updateSession } = useSession();
  const router = useRouter();

  const [state, setState] = useState<FlowState>("idle");
  const [freeData, setFreeData] = useState<FreePremiumData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [premiumExpiry, setPremiumExpiry] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* When the modal opens → check eligibility */
  useEffect(() => {
    if (!open) {
      setState("idle");
      return;
    }

    setState("checking");
    setError(null);
    setSelectedPlan(null);
    setPremiumExpiry(null);

    fetch("/api/payment/free-premium")
      .then((r) => r.json())
      .then((d: FreePremiumData) => {
        setFreeData(d);
        if (d.isFreePeriod && !d.alreadyClaimed && d.isWithinFreeQuota) {
          setState("free_modal");
        } else {
          setState("paid_modal");
          // Pre-load Razorpay for paid flow
          loadRazorpay().catch(() => {});
        }
      })
      .catch(() => {
        setState("paid_modal");
        loadRazorpay().catch(() => {});
      });
  }, [open]);

  /* ── Free activation ──────────────────────────────── */
  const activateFree = useCallback(async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan first");
      return;
    }

    setState("processing");
    try {
      const res = await fetch("/api/payment/free-premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await updateSession(
        variant === "student"
          ? { isPremium: true }
          : { isOwnerPremium: true },
      );
      router.refresh();
      setPremiumExpiry(data.premiumExpiry);
      setState("success");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to activate premium";
      setError(msg);
      toast.error(msg);
      setState("error");
    }
  }, [selectedPlan, variant, updateSession, router]);

  /* ── Paid (Razorpay) flow ─────────────────────────── */
  const startPaidFlow = useCallback(async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan first");
      return;
    }

    setState("processing");
    try {
      await loadRazorpay();

      const endpoint =
        variant === "student"
          ? "/api/payment/create-order"
          : "/api/payment/create-owner-order";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) throw new Error("Payment gateway unavailable");

      const rzp = new Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "AasPass",
        description: `Premium ${selectedPlan} Plan`,
        order_id: data.orderId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        handler: async (response: any) => {
          try {
            const verifyEndpoint =
              variant === "student"
                ? "/api/payment/verify"
                : "/api/payment/verify-owner";

            const verifyRes = await fetch(verifyEndpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planId: selectedPlan,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error);

            await updateSession(
              variant === "student"
                ? { isPremium: true }
                : { isOwnerPremium: true },
            );
            router.refresh();
            setPremiumExpiry(
              verifyData.premiumExpiry || verifyData.ownerPremiumExpiry,
            );
            setState("success");
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Payment verification failed";
            setError(msg);
            toast.error(msg);
            setState("error");
          }
        },
        modal: {
          ondismiss: () => setState("paid_modal"),
        },
        theme: { color: "#6366f1" },
      });
      rzp.open();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start payment";
      setError(msg);
      toast.error(msg);
      setState("error");
    }
  }, [selectedPlan, variant, updateSession, router]);

  /* ── Reset ────────────────────────────────────────── */
  const reset = useCallback(() => {
    setState("idle");
    setSelectedPlan(null);
    setPremiumExpiry(null);
    setError(null);
    setFreeData(null);
  }, []);

  return {
    state,
    freeData,
    selectedPlan,
    setSelectedPlan,
    premiumExpiry,
    error,
    activateFree,
    startPaidFlow,
    reset,
  } as const;
}
