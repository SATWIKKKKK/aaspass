"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Crown, Check, Zap, Shield, MessageSquare, Gift, Clock, Star,
  X, Loader2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
// UI components
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";

const PLANS = [
  { id: "monthly", name: "Monthly", price: 99, period: "month", popular: false },
  { id: "quarterly", name: "Quarterly", price: 249, period: "3 months", popular: true, save: "17%" },
  { id: "yearly", name: "Yearly", price: 799, period: "year", popular: false, save: "33%" },
];

const FEATURES = [
  { icon: MessageSquare, title: "AI Chat Assistant", desc: "Smart property search" },
  { icon: Zap, title: "Priority Booking", desc: "Book before others" },
  { icon: Shield, title: "Late Fee Waiver", desc: "No late charges" },
  { icon: Gift, title: "2x SuperCoins", desc: "Double rewards" },
  { icon: Clock, title: "24/7 Support", desc: "Priority help" },
  { icon: Star, title: "Exclusive Deals", desc: "Members-only offers" },
];

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("quarterly");
  const [processing, setProcessing] = useState(false);
  const isPremium = (session?.user as any)?.isPremium;

  if (!open) return null;

  const handleUpgrade = async () => {
    if (!session) { router.push("/login"); return; }
    setProcessing(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremium: true }),
      });
      if (res.ok) {
        toast.success("Welcome to Premium! 🎉");
        router.refresh();
        onClose();
      } else {
        toast.error("Failed to upgrade");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center z-10 transition-colors">
          <X className="h-4 w-4 text-gray-500" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-t-2xl p-6 pb-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Crown className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isPremium ? "You're Premium! 👑" : "Unlock AasPass Premium"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isPremium ? "Enjoying all premium benefits" : "AI search, priority booking & more"}
          </p>
        </div>

        <div className="p-6">
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
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
              {/* Plans */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={cn(
                      "relative p-3 rounded-xl border-2 text-center transition-all",
                      selectedPlan === plan.id
                        ? "border-amber-400 bg-amber-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Best
                        </Badge>
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-600">{plan.name}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{formatPrice(plan.price)}</p>
                    <p className="text-[10px] text-gray-400">/{plan.period}</p>
                    {plan.save && <Badge variant="outline" className="text-[9px] text-green-600 border-green-200 mt-1 px-1.5">Save {plan.save}</Badge>}
                    {selectedPlan === plan.id && (
                      <div className="absolute top-2 right-2 h-4 w-4 bg-amber-500 rounded-full flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-12"
                onClick={handleUpgrade}
                disabled={processing}
              >
                {processing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Crown className="h-4 w-4 mr-2" /> Get Premium Now</>
                )}
              </Button>
              <p className="text-[10px] text-gray-400 text-center mt-2">Cancel anytime. No questions asked.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
