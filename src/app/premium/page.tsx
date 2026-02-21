"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Crown, Check, Zap, Shield, MessageSquare, Gift, Clock, Star,
  ChevronLeft, Loader2, Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";

const PLANS = [
  { id: "monthly", name: "Monthly", price: 99, period: "month", popular: false },
  { id: "quarterly", name: "Quarterly", price: 249, period: "3 months", popular: true, save: "17%" },
  { id: "yearly", name: "Yearly", price: 799, period: "year", popular: false, save: "33%" },
];

const FEATURES = [
  { icon: MessageSquare, title: "AI Chat Assistant", desc: "Get instant answers to your accommodation queries" },
  { icon: Zap, title: "Priority Booking", desc: "Book properties before they go public" },
  { icon: Shield, title: "Late Fee Waiver", desc: "No late fees on monthly payments" },
  { icon: Gift, title: "2x SuperCoins", desc: "Earn double SuperCoins on every booking" },
  { icon: Clock, title: "24/7 Priority Support", desc: "Get help faster with dedicated support" },
  { icon: Star, title: "Exclusive Deals", desc: "Access members-only discounts and offers" },
];

export default function PremiumPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("quarterly");
  const [processing, setProcessing] = useState(false);
  const isPremium = (session?.user as any)?.isPremium;

  const handleUpgrade = async () => {
    if (!session) { router.push("/login"); return; }
    setProcessing(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPremium: true }) });
      if (res.ok) { toast.success("Welcome to Premium! 🎉 Refresh to see changes."); router.refresh(); }
      else toast.error("Failed to upgrade");
    } catch { toast.error("Something went wrong"); }
    finally { setProcessing(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant={session ? ((session.user as any)?.role === "OWNER" ? "admin" : "student") : "public"} />

      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Badge className="bg-amber-100 text-amber-700 mb-4"><Crown className="h-3 w-3 mr-1" /> AasPass Premium</Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {isPremium ? "You're a Premium Member! 👑" : "Unlock the Full AasPass Experience"}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isPremium ? "Enjoy all premium benefits" : "Get AI chat, priority booking, 2x SuperCoins, and exclusive deals"}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center mb-4"><feature.icon className="h-5 w-5 text-amber-600" /></div>
                <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {!isPremium && (
          <>
            {/* Plans */}
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Choose Your Plan</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              {PLANS.map((plan) => (
                <Card key={plan.id} className={cn("cursor-pointer transition-all relative", selectedPlan === plan.id ? "border-amber-400 shadow-lg ring-2 ring-amber-200" : "hover:border-gray-300")}
                  onClick={() => setSelectedPlan(plan.id)}>
                  {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge className="bg-amber-500 text-white"><Sparkles className="h-3 w-3 mr-1" /> Most Popular</Badge></div>}
                  <CardContent className="p-6 text-center">
                    <h3 className="font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <div className="my-4"><span className="text-3xl font-bold text-gray-900">{formatPrice(plan.price)}</span><span className="text-sm text-gray-500">/{plan.period}</span></div>
                    {plan.save && <Badge variant="outline" className="text-green-600 border-green-200">Save {plan.save}</Badge>}
                    <div className="mt-4">{selectedPlan === plan.id ? <div className="h-6 w-6 bg-amber-500 rounded-full mx-auto flex items-center justify-center"><Check className="h-4 w-4 text-white" /></div> : <div className="h-6 w-6 border-2 border-gray-200 rounded-full mx-auto" />}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center"><Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white px-12 h-14 text-lg" onClick={handleUpgrade} disabled={processing}>{processing ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</> : <><Crown className="h-5 w-5 mr-2" />Get Premium Now</>}</Button><p className="text-sm text-gray-400 mt-3">Cancel anytime. No questions asked.</p></div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
