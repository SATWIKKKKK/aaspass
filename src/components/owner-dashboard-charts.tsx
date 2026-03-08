"use client";

import * as React from "react";
import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart,
  CartesianGrid, Line, LineChart, XAxis, YAxis,
  Bar, BarChart,
  Pie, PieChart, Cell,
  Area, AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/* ════════════════════════════════════════════════════════ */
/*                         TYPES                          */
/* ════════════════════════════════════════════════════════ */
interface RadarPoint { month: string; views: number; wishlists: number }
interface LinePoint  { date: string; views: number; cartAdds: number }
interface BarPoint   { month: string; [service: string]: string | number }
interface PiePoint   { name: string; value: number; serviceType: string }
interface AreaPoint  { month: string; uniqueVisitors: number; newVisitors: number }

interface ChartData {
  radar: { data: RadarPoint[]; trend: number };
  line: LinePoint[];
  bar: { data: BarPoint[]; services: string[] };
  pie: PiePoint[];
  area: AreaPoint[];
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f43f5e", "#f97316", "#10b981", "#06b6d4"];

/* ════════════════════════════════════════════════════════ */
/*                    RADAR CHART                         */
/* ════════════════════════════════════════════════════════ */
function OwnerRadarChart({ data, trend }: { data: RadarPoint[]; trend: number }) {
  const config: ChartConfig = {
    views:     { label: "Views",     color: "#3b82f6" },
    wishlists: { label: "Wishlists", color: "#f43f5e" },
  };

  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle className="text-base">Performance Radar</CardTitle>
        <CardDescription>Views vs Wishlists — Last 6 months</CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer config={config} className="mx-auto aspect-square max-h-[250px]">
          <RadarChart data={data}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid radialLines={false} />
            <Radar dataKey="views" fill="var(--color-views)" fillOpacity={0} stroke="var(--color-views)" strokeWidth={2} />
            <Radar dataKey="wishlists" fill="var(--color-wishlists)" fillOpacity={0} stroke="var(--color-wishlists)" strokeWidth={2} />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {trend >= 0 ? (
            <>Trending up by {trend}% this month <TrendingUp className="h-4 w-4 text-green-600" /></>
          ) : (
            <>Down {Math.abs(trend)}% this month <TrendingDown className="h-4 w-4 text-red-500" /></>
          )}
        </div>
        <div className="leading-none text-muted-foreground">Month-over-month views comparison</div>
      </CardFooter>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════ */
/*                  LINE CHART (Interactive)               */
/* ════════════════════════════════════════════════════════ */
function OwnerLineChart({ data }: { data: LinePoint[] }) {
  const [activeChart, setActiveChart] = React.useState<"views" | "cartAdds">("views");

  const config: ChartConfig = {
    views:    { label: "Views",     color: "#3b82f6" },
    cartAdds: { label: "Cart Adds", color: "#f97316" },
  };

  const total = React.useMemo(() => ({
    views: data.reduce((acc, curr) => acc + curr.views, 0),
    cartAdds: data.reduce((acc, curr) => acc + curr.cartAdds, 0),
  }), [data]);

  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle className="text-base">Daily Activity — 90 Days</CardTitle>
          <CardDescription>Views and cart additions over time</CardDescription>
        </div>
        <div className="flex">
          {(["views", "cartAdds"] as const).map((key) => (
            <button
              key={key}
              data-active={activeChart === key}
              className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-xs text-muted-foreground">{config[key].label}</span>
              <span className="text-lg leading-none font-bold sm:text-3xl">{total[key].toLocaleString()}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
          <LineChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                />
              }
            />
            <Line dataKey={activeChart} type="monotone" stroke={`var(--color-${activeChart})`} strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════ */
/*                    BAR CHART                           */
/* ════════════════════════════════════════════════════════ */
function OwnerBarChart({ data, services }: { data: BarPoint[]; services: string[] }) {
  const colors = ["#3b82f6", "#8b5cf6", "#f43f5e", "#f97316", "#10b981"];
  const config: ChartConfig = {};
  services.forEach((s, i) => {
    config[s] = { label: s, color: colors[i % colors.length] };
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Bookings by Service</CardTitle>
        <CardDescription>Monthly confirmed bookings — Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {services.map((s, i) => (
              <Bar key={s} dataKey={s} fill={colors[i % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════ */
/*                   PIE / DONUT CHART                    */
/* ════════════════════════════════════════════════════════ */
function OwnerPieChart({ data }: { data: PiePoint[] }) {
  const config: ChartConfig = {};
  data.forEach((d, i) => {
    config[d.name] = { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle className="text-base">Students by Service</CardTitle>
        <CardDescription>Active student distribution</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">No student data yet</div>
        ) : (
          <ChartContainer config={config} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground text-center">
        {total} total active students across {data.length} service{data.length !== 1 ? "s" : ""}
      </CardFooter>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════ */
/*                    AREA CHART                          */
/* ════════════════════════════════════════════════════════ */
function OwnerAreaChart({ data }: { data: AreaPoint[] }) {
  const config: ChartConfig = {
    uniqueVisitors: { label: "Cumulative Visitors", color: "#10b981" },
    newVisitors:    { label: "New Visitors",        color: "#06b6d4" },
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Visitor Growth</CardTitle>
        <CardDescription>Cumulative unique visitors — Last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area dataKey="uniqueVisitors" type="monotone" fill="var(--color-uniqueVisitors)" fillOpacity={0.2} stroke="var(--color-uniqueVisitors)" strokeWidth={2} />
            <Area dataKey="newVisitors" type="monotone" fill="var(--color-newVisitors)" fillOpacity={0.15} stroke="var(--color-newVisitors)" strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════ */
/*               MAIN CHARTS SECTION                      */
/* ════════════════════════════════════════════════════════ */
export function OwnerDashboardCharts() {
  const [chartData, setChartData] = React.useState<ChartData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/owner/charts")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setChartData({
            radar: {
              data: Array.isArray(data?.radar?.data) ? data.radar.data : [],
              trend: typeof data?.radar?.trend === "number" ? data.radar.trend : 0,
            },
            line: Array.isArray(data?.line) ? data.line : [],
            bar: {
              data: Array.isArray(data?.bar?.data) ? data.bar.data : [],
              services: Array.isArray(data?.bar?.services) ? data.bar.services : [],
            },
            pie: Array.isArray(data?.pie) ? data.pie : [],
            area: Array.isArray(data?.area) ? data.area : [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className={i === 2 ? "lg:col-span-2" : ""}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-[280px]">
                <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!chartData) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-400">
          No analytics data available yet. Share your services to start tracking.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <OwnerRadarChart data={chartData.radar.data} trend={chartData.radar.trend} />
      <div className="lg:col-span-2">
        <OwnerLineChart data={chartData.line} />
      </div>
      <OwnerBarChart data={chartData.bar.data} services={chartData.bar.services} />
      <OwnerPieChart data={chartData.pie} />
      <div className="lg:col-span-2">
        <OwnerAreaChart data={chartData.area} />
      </div>
    </div>
  );
}
