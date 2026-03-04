"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, Users, Home, Crown, MapPin, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";

function SimpleBarChart({ data, labelKey, valueKey, color = "bg-blue-500" }: { data: any[]; labelKey: string; valueKey: string; color?: string }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No data</p>;
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey]) || 0));
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-600 w-20 truncate text-right">{d[labelKey]}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
            <div
              className={`h-full rounded-full ${color} transition-all duration-500`}
              style={{ width: `${maxVal > 0 ? (Number(d[valueKey]) / maxVal) * 100 : 0}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-gray-700">
              {Number(d[valueKey]).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimpleTrendChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No data</p>;
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey]) || 0));
  const height = 120;
  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-[2px]">
        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0;
          const barHeight = maxVal > 0 ? (val / maxVal) * (height - 20) : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group">
              <div className="opacity-0 group-hover:opacity-100 text-[9px] text-gray-500 mb-0.5 transition-opacity whitespace-nowrap">
                {d[labelKey]}: {val.toLocaleString()}
              </div>
              <div
                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors min-h-[2px]"
                style={{ height: barHeight }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SuperAdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/superadmin/analytics?range=${range}`);
        const raw = await res.json();
        // Normalize API response for components
        setAnalytics({
          dailyUsers: raw.charts?.usersByDay ?? [],
          dailyBookings: raw.charts?.bookingsByDay ?? [],
          dailyRevenue: raw.charts?.revenueByDay ?? [],
          topServices: (raw.rankings?.topServices ?? []).map((s: any) => ({ name: s.name, bookings: s._count?.bookings ?? 0 })),
          topCities: raw.rankings?.topCities ?? [],
          serviceTypeBreakdown: (raw.rankings?.serviceTypeBreakdown ?? []).map((s: any) => ({ type: s.serviceType, count: s.count })),
          premiumConversion: raw.premiumConversion?.rate ?? 0,
          totals: raw.totals,
        });
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [range]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground">Trends and insights</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Premium Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 text-center">
            <Crown className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-xs text-muted-foreground">Premium Conversion</p>
            <p className="text-3xl font-bold text-gray-900">{analytics?.premiumConversion ?? "—"}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-xs text-muted-foreground">New Users ({range}d)</p>
            <p className="text-3xl font-bold text-gray-900">{analytics?.dailyUsers?.reduce((a: number, d: any) => a + Number(d.count), 0)?.toLocaleString() ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-xs text-muted-foreground">Revenue ({range}d)</p>
            <p className="text-3xl font-bold text-gray-900">{formatPrice(analytics?.dailyRevenue?.reduce((a: number, d: any) => a + Number(d.total), 0) ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily Users */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />New Users per Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleTrendChart data={analytics?.dailyUsers ?? []} labelKey="date" valueKey="count" />
          </CardContent>
        </Card>

        {/* Daily Bookings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />Daily Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleTrendChart data={analytics?.dailyBookings ?? []} labelKey="date" valueKey="count" />
          </CardContent>
        </Card>

        {/* Daily Revenue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />Daily Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleTrendChart data={analytics?.dailyRevenue ?? []} labelKey="date" valueKey="total" />
          </CardContent>
        </Card>

        {/* Service Type Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Home className="h-4 w-4 text-orange-500" />Service Type Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={analytics?.serviceTypeBreakdown ?? []} labelKey="type" valueKey="count" color="bg-orange-500" />
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />Top Services by Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={analytics?.topServices ?? []} labelKey="name" valueKey="bookings" color="bg-blue-500" />
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />Top Cities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={analytics?.topCities ?? []} labelKey="city" valueKey="count" color="bg-red-500" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
