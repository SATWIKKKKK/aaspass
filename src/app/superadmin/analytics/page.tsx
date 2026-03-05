"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, Users, Home, Crown, MapPin, PieChart as PieChartIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from "recharts";

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

function SimpleTrendChart({ data, labelKey, valueKey, color = "bg-blue-500" }: { data: any[]; labelKey: string; valueKey: string; color?: string }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No data</p>;
  const maxVal = Math.max(...data.map((d) => Number(d[valueKey]) || 0));
  const height = 120;
  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-[2px]">
        {data.map((d, i) => {
          const val = Number(d[valueKey]) || 0;
          const barHeight = maxVal > 0 ? (val / maxVal) * (height - 20) : 0;
          const hoverColor = color.replace("bg-", "hover:bg-").replace("500", "600");
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end group">
              <div className="opacity-0 group-hover:opacity-100 text-[9px] text-gray-500 mb-0.5 transition-opacity whitespace-nowrap">
                {String(d[labelKey]).split("T")[0]}: {val.toLocaleString()}
              </div>
              <div
                className={`w-full ${color} rounded-t ${hoverColor} transition-colors min-h-[2px]`}
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
          roleBreakdown: (raw.breakdowns?.roleBreakdown ?? []).map((r: any) => ({ name: r.role, value: r.count })),
          bookingStatusBreakdown: (raw.breakdowns?.bookingStatusBreakdown ?? []).map((b: any) => ({ name: b.status, value: b.count })),
          cumulativeRevenue: (raw.breakdowns?.cumulativeRevenue ?? []).map((d: any) => ({
            date: String(d.date).split("T")[0],
            total: Number(d.total),
          })),
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
            <SimpleTrendChart data={analytics?.dailyUsers ?? []} labelKey="date" valueKey="count" color="bg-blue-500" />
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
            <SimpleTrendChart data={analytics?.dailyBookings ?? []} labelKey="date" valueKey="count" color="bg-green-500" />
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
            <SimpleTrendChart data={analytics?.dailyRevenue ?? []} labelKey="date" valueKey="total" color="bg-purple-500" />
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

      {/* ─── New Recharts-powered Charts ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Cumulative Revenue Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />Cumulative Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ total: { label: "Revenue", color: "#10b981" } } satisfies ChartConfig} className="h-[220px] w-full">
              <AreaChart data={analytics?.cumulativeRevenue ?? []} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Users vs Bookings Line Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" />Users vs Bookings Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              users: { label: "Users", color: "#6366f1" },
              bookings: { label: "Bookings", color: "#f59e0b" },
            } satisfies ChartConfig} className="h-[220px] w-full">
              <LineChart data={(() => {
                const usersMap = new Map((analytics?.dailyUsers ?? []).map((d: any) => [String(d.date).split("T")[0], Number(d.count)]));
                const bookingsMap = new Map((analytics?.dailyBookings ?? []).map((d: any) => [String(d.date).split("T")[0], Number(d.count)]));
                const allDates = new Set([...usersMap.keys(), ...bookingsMap.keys()]);
                return Array.from(allDates).sort().map((date) => ({
                  date, users: usersMap.get(date) || 0, bookings: bookingsMap.get(date) || 0,
                }));
              })()} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="bookings" stroke="var(--color-bookings)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* User Roles Pie/Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-violet-500" />User Roles Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];
              const roleConfig: ChartConfig = {};
              (analytics?.roleBreakdown ?? []).forEach((r: any, i: number) => {
                roleConfig[r.name] = { label: r.name, color: COLORS[i % COLORS.length] };
              });
              return (
                <ChartContainer config={roleConfig} className="h-[220px] w-full">
                  <PieChart>
                    <Pie
                      data={analytics?.roleBreakdown ?? []}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      paddingAngle={3} dataKey="value" nameKey="name"
                    >
                      {(analytics?.roleBreakdown ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* Booking Status Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-sky-500" />Booking Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
              const statusConfig: ChartConfig = {};
              (analytics?.bookingStatusBreakdown ?? []).forEach((s: any, i: number) => {
                statusConfig[s.name] = { label: s.name, color: COLORS[i % COLORS.length] };
              });
              return (
                <ChartContainer config={statusConfig} className="h-[220px] w-full">
                  <PieChart>
                    <Pie
                      data={analytics?.bookingStatusBreakdown ?? []}
                      cx="50%" cy="50%" outerRadius={80}
                      paddingAngle={2} dataKey="value" nameKey="name"
                    >
                      {(analytics?.bookingStatusBreakdown ?? []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* Service Type Radar Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Home className="h-4 w-4 text-teal-500" />Service Types Radar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Count", color: "#14b8a6" } } satisfies ChartConfig} className="h-[280px] w-full">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analytics?.serviceTypeBreakdown ?? []}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="type" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fontSize: 10 }} />
                <Radar name="Services" dataKey="count" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.3} strokeWidth={2} />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Top Services Grouped Bar */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />Top 10 Services — Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ bookings: { label: "Bookings", color: "#3b82f6" } } satisfies ChartConfig} className="h-[280px] w-full">
              <BarChart data={(analytics?.topServices ?? []).slice(0, 10)} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
