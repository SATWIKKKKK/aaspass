"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Edit, Settings, Bell, Shield, Crown, ChevronRight, LogOut,
  Camera, Mail, Phone, MapPin, CreditCard, Key, Sparkles, Bot, AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { PremiumModal } from "@/components/premium-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [premiumOpen, setPremiumOpen] = useState(false);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!session) redirect("/login");

  const user = session.user as any;
  const isPremium = user?.isPremium;
  const isOwner = user?.role === "OWNER";

  // Premium status calculations
  const premiumExpiry = user?.premiumExpiry ? new Date(user.premiumExpiry) : null;
  const subscriptionStart = user?.subscriptionStart ? new Date(user.subscriptionStart) : null;
  const now = new Date();
  const daysRemaining = premiumExpiry ? Math.max(0, Math.ceil((premiumExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const totalDays = premiumExpiry && subscriptionStart ? Math.ceil((premiumExpiry.getTime() - subscriptionStart.getTime()) / (1000 * 60 * 60 * 24)) : 30;
  const progressPct = totalDays > 0 ? Math.min(100, Math.round(((totalDays - daysRemaining) / totalDays) * 100)) : 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  const planLabel = user?.subscriptionPlan === "QUARTERLY" ? "Quarterly" : user?.subscriptionPlan === "YEARLY" ? "Yearly" : "Monthly";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant={isOwner ? "admin" : "student"} onPremiumClick={() => setPremiumOpen(true)} />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile & Settings</h1>

        {/* Profile Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.image || ""} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(user?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <button className="absolute bottom-0 right-0 h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center shadow-lg">
                  <Camera className="h-4 w-4" />
                </button>
                {isPremium && (
                  <div className="absolute -top-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-2xl font-bold text-gray-900">{user?.name || "User"}</h2>
                  {isPremium && (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                      <Crown className="h-3 w-3 mr-1" /> Premium
                    </Badge>
                  )}
                </div>
                <p className="text-gray-500 mt-1">{user?.email}</p>
                <Badge variant="outline" className="mt-2">{user?.role || "STUDENT"}</Badge>
              </div>
              <Link href="/settings/edit">
                <Button><Edit className="h-4 w-4 mr-2" /> Edit Profile</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Premium Status Section */}
        {!isOwner && (
          <Card className={`mb-6 overflow-hidden ${isPremium ? "border-yellow-200" : "border-gray-200"}`}>
            <div className={isPremium ? "bg-gradient-to-r from-yellow-50 to-amber-50" : "bg-gradient-to-r from-indigo-50 to-purple-50"}>
              <CardContent className="p-6">
                {isPremium ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-md">
                          <Crown className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">AasPass Premium</h3>
                          <p className="text-sm text-gray-500">{planLabel} Plan</p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-700">Active</Badge>
                    </div>

                    {isExpiringSoon && (
                      <div className="flex items-center gap-2 bg-amber-100 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="text-sm text-amber-700 font-medium">Your subscription expires in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}. Renew to keep your benefits.</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Subscription Progress</span>
                        <span className="font-bold text-gray-900">{daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{subscriptionStart ? subscriptionStart.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span>
                        <span>{premiumExpiry ? premiumExpiry.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { icon: Bot, label: "AI Chat", desc: "Unlimited" },
                        { icon: Sparkles, label: "Priority", desc: "Support" },
                        { icon: Crown, label: "SuperCoins", desc: "2x Rewards" },
                      ].map((f) => (
                        <div key={f.label} className="bg-white/70 rounded-xl p-3 text-center">
                          <f.icon className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
                          <p className="text-xs font-bold text-gray-900">{f.label}</p>
                          <p className="text-[10px] text-gray-400">{f.desc}</p>
                        </div>
                      ))}
                    </div>

                    {isExpiringSoon && (
                      <Button onClick={() => setPremiumOpen(true)} className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold hover:opacity-90">
                        Renew Subscription
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Crown className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Upgrade to Premium</h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                      Unlock AI Chat Assistant, priority support, 2x SuperCoins rewards, and exclusive features.
                    </p>
                    <Button onClick={() => setPremiumOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold px-8 hover:opacity-90">
                      View Plans
                    </Button>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        )}

        {/* Settings Menu */}
        <div className="space-y-3">
          {[
            { href: "/settings/edit", icon: User, label: "Personal Information", desc: "Name, email, phone, profile photo" },
            { href: "/settings/edit", icon: Shield, label: "Security", desc: "Password, two-factor authentication" },
            { href: "/notifications", icon: Bell, label: "Notifications", desc: "View your notifications" },
            { href: "/dashboard", icon: CreditCard, label: "Bookings & Payments", desc: "View bookings, payment history" },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="hover:bg-gray-50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
