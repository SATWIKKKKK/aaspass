"use client";

import { useState, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import Link from "next/link";
import {
  Users, Building2, CalendarCheck, IndianRupee, UserPlus, Crown,
  ShieldAlert, TrendingUp, Clock, Star, AlertTriangle, CreditCard,
  ArrowRight, Loader2, Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPrice, formatDate } from "@/lib/utils";

interface DashboardData {
  metrics: {
    totalUsers: number;
    totalOwners: number;
    totalStudents: number;
    totalServices: number;
    totalBookings: number;
    totalRevenue: number;
    signupsToday: number;
    signupsWeek: number;
    signupsMonth: number;
    activePremium: number;
    totalViolations: number;
  };
  health: {
    pendingProperties: number;
    failedPayments24h: number;
    fullyBookedServices: number;
  };
  recentActivity: {
    users: any[];
    bookings: any[];
    reviews: any[];
    services: any[];
  };
}

function MetricCard({ title, value, icon: Icon, color, subtext }: {
  title: string; value: string | number; icon: any; color: string; subtext?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200" data-gsap="sa-metric" style={{ opacity: 0 }}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </div>
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time metrics and activity</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-red-500">Failed to load dashboard data.</p>;
  }

  const { metrics, health, recentActivity } = data;

  // GSAP entrance animations
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo("[data-gsap='sa-header']", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 })
      .fromTo("[data-gsap='sa-metric']", { opacity: 0, y: 16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.05 }, "-=0.2")
      .fromTo("[data-gsap='sa-section']", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.1 }, "-=0.1");
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div data-gsap="sa-header" style={{ opacity: 0 }}>
        <h2 className="text-xl font-bold text-gray-900">Platform Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Real-time metrics and activity</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Users" value={metrics.totalUsers.toLocaleString()} icon={Users} color="bg-blue-500" subtext={`${metrics.totalStudents} students · ${metrics.totalOwners} owners`} />
        <MetricCard title="Active Services" value={metrics.totalServices.toLocaleString()} icon={Building2} color="bg-green-500" />
        <MetricCard title="Total Bookings" value={metrics.totalBookings.toLocaleString()} icon={CalendarCheck} color="bg-purple-500" />
        <MetricCard title="Total Revenue" value={formatPrice(metrics.totalRevenue)} icon={IndianRupee} color="bg-emerald-600" />
        <MetricCard title="New Signups" value={metrics.signupsToday} icon={UserPlus} color="bg-cyan-500" subtext={`${metrics.signupsWeek} this week · ${metrics.signupsMonth} this month`} />
        <MetricCard title="Premium Users" value={metrics.activePremium} icon={Crown} color="bg-yellow-500" />
        <MetricCard title="Violations" value={metrics.totalViolations} icon={ShieldAlert} color="bg-red-500" />
        <MetricCard title="Growth" value={`+${metrics.signupsMonth}`} icon={TrendingUp} color="bg-indigo-500" subtext="New users this month" />
      </div>

      {/* Quick Actions */}
      <Card data-gsap="sa-section" style={{ opacity: 0 }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/superadmin/premium"><Button size="sm" variant="outline" className="gap-2"><Crown className="h-3.5 w-3.5" />Grant Premium</Button></Link>
          <Link href="/superadmin/violations"><Button size="sm" variant="outline" className="gap-2"><ShieldAlert className="h-3.5 w-3.5" />Issue Warning</Button></Link>
          <Link href="/superadmin/violations"><Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50"><AlertTriangle className="h-3.5 w-3.5" />Suspend User</Button></Link>
          <Link href="/superadmin/offers"><Button size="sm" variant="outline" className="gap-2"><CreditCard className="h-3.5 w-3.5" />Add Offer</Button></Link>
          <Link href="/superadmin/audit"><Button size="sm" variant="outline" className="gap-2"><Eye className="h-3.5 w-3.5" />Audit Logs</Button></Link>
          <Link href="/superadmin/settings"><Button size="sm" variant="outline" className="gap-2"><UserPlus className="h-3.5 w-3.5" />Add Admin</Button></Link>
        </CardContent>
      </Card>

      {/* Platform Health + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Platform Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Pending Approvals</span>
              <Badge variant={health.pendingProperties > 0 ? "destructive" : "secondary"} className="text-xs">
                {health.pendingProperties}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Failed Payments (24h)</span>
              <Badge variant={health.failedPayments24h > 0 ? "destructive" : "secondary"} className="text-xs">
                {health.failedPayments24h}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Fully Booked</span>
              <Badge variant="secondary" className="text-xs">
                {health.fullyBookedServices}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Signups */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Signups</CardTitle>
            <Link href="/superadmin/users" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.users.map((u: any) => (
              <Link
                key={u.id}
                href={`/superadmin/users/${u.id}`}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(u.createdAt)}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
            <Link href="/superadmin/bookings" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentActivity.bookings.map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.property?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{b.student?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatPrice(b.grandTotal)}</p>
                  <Badge
                    variant={b.status === "CONFIRMED" || b.status === "ACTIVE" ? "success" : "secondary"}
                    className="text-[10px]"
                  >
                    {b.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
