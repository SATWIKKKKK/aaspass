"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  User, Edit, Settings, Bell, Shield, Crown, ChevronRight, LogOut,
  Camera, Mail, Phone, MapPin, CreditCard, Key,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!session) redirect("/login");

  const user = session.user;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant={user?.role === "OWNER" ? "admin" : "student"} />

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
              </div>
              <div className="text-center sm:text-left flex-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h2 className="text-2xl font-bold text-gray-900">{user?.name || "User"}</h2>
                  {user?.isPremium && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
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

        {/* Settings Menu */}
        <div className="space-y-3">
          {[
            { href: "/settings/edit", icon: User, label: "Personal Information", desc: "Name, email, phone, profile photo" },
            { href: "/settings/security", icon: Shield, label: "Security", desc: "Password, two-factor authentication" },
            { href: "/settings/notifications", icon: Bell, label: "Notifications", desc: "Email, push, SMS preferences" },
            { href: "/settings/payment", icon: CreditCard, label: "Payment Methods", desc: "Saved cards, UPI, wallets" },
            { href: "/premium", icon: Crown, label: "Premium Membership", desc: user?.isPremium ? "Manage your premium plan" : "Upgrade to premium" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
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
