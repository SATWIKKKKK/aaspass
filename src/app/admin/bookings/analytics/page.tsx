"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, Loader2, TrendingUp, Filter,
  Building2, CheckCircle, XCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RouteGuard } from "@/components/route-guard";
import { cn, formatPrice } from "@/lib/utils";

interface BookingItem {
  id: string;
  bookingNo: string;
  status: string;
  totalPrice: number;
  grandTotal: number;
  createdAt: string;
  checkIn: string;
  checkOut: string;
  property: { name: string; slug: string; serviceType: string };
  student: { name: string; email: string; phone: string | null };
}

type TimeRange = "this_month" | "this_week" | "this_year" | "last_3m" | "last_6m" | "all";

function getDateRange(range: TimeRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (range) {
    case "this_week":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "this_year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "last_3m":
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      break;
    case "last_6m":
      start = new Date(now);
      start.setMonth(now.getMonth() - 6);
      break;
    case "all":
    default:
      start = new Date(2020, 0, 1);
      break;
  }
  return { start, end };
}

const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_year", label: "This Year" },
  { value: "last_3m", label: "Last 3 Months" },
  { value: "last_6m", label: "Last 6 Months" },
  { value: "all", label: "All Time" },
];

function BookingsAnalyticsInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [properties, setProperties] = useState<{ name: string; slug: string; serviceType: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("this_month");
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/bookings").then(r => r.json()),
      fetch("/api/properties?owner=me").then(r => r.json()),
    ]).then(([bData, pData]) => {
      setBookings(bData.bookings || []);
      setProperties((pData.properties || []).map((p: any) => ({ name: p.name, slug: p.slug, serviceType: p.serviceType })));
    }).finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading)
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const { start, end } = getDateRange(timeRange);
  const filtered = bookings.filter(b => {
    const d = new Date(b.createdAt);
    const inRange = d >= start && d <= end;
    const matchService = serviceFilter === "all" || b.property.serviceType === serviceFilter;
    return inRange && matchService;
  });

  const confirmed = filtered.filter(b => ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status));
  const pending = filtered.filter(b => b.status === "PENDING");
  const cancelled = filtered.filter(b => b.status === "CANCELLED");
  const totalRevenue = confirmed.reduce((s, b) => s + b.grandTotal, 0);

  // Group by service
  const byService: Record<string, BookingItem[]> = {};
  for (const b of filtered) {
    const key = b.property.name;
    if (!byService[key]) byService[key] = [];
    byService[key].push(b);
  }

  const serviceTypes = [...new Set(properties.map(p => p.serviceType))];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <button onClick={() => router.push("/admin/dashboard")} className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Bookings Analytics</h1>
              <p className="text-xs text-gray-500">Confirmed bookings by service with time filters</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {serviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-200 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-700" /></div>
                <div><p className="text-2xl font-black text-green-700">{confirmed.length}</p><p className="text-xs text-green-600">Confirmed</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 border-yellow-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-200 flex items-center justify-center"><Clock className="h-5 w-5 text-yellow-700" /></div>
                <div><p className="text-2xl font-black text-yellow-700">{pending.length}</p><p className="text-xs text-yellow-600">Pending</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-200 flex items-center justify-center"><XCircle className="h-5 w-5 text-red-700" /></div>
                <div><p className="text-2xl font-black text-red-700">{cancelled.length}</p><p className="text-xs text-red-600">Cancelled</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-200 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-blue-700" /></div>
                <div><p className="text-2xl font-black text-blue-700">{formatPrice(totalRevenue)}</p><p className="text-xs text-blue-600">Revenue</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings by Service */}
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" /> Bookings by Service
        </h3>

        {Object.keys(byService).length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No bookings found for the selected period</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(byService).map(([serviceName, sBookings]) => {
              const sConfirmed = sBookings.filter(b => ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status)).length;
              const sRevenue = sBookings.filter(b => ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status)).reduce((s, b) => s + b.grandTotal, 0);
              return (
                <Card key={serviceName} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{serviceName}</span>
                      <Badge className="bg-primary/10 text-primary text-xs">{sBookings[0]?.property.serviceType}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-green-700">{sConfirmed}</p>
                        <p className="text-[10px] text-green-600">Confirmed</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-gray-700">{sBookings.length}</p>
                        <p className="text-[10px] text-gray-500">Total</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-blue-700">{formatPrice(sRevenue)}</p>
                        <p className="text-[10px] text-blue-600">Revenue</p>
                      </div>
                    </div>
                    {/* Recent bookings list */}
                    <div className="space-y-1.5">
                      {sBookings.slice(0, 5).map(b => (
                        <div key={b.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{b.student.name}</p>
                            <p className="text-[10px] text-gray-400">{new Date(b.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                          </div>
                          <Badge variant={["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status) ? "success" : b.status === "PENDING" ? "secondary" : "destructive"} className="text-[10px] shrink-0 ml-2">
                            {b.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingsAnalyticsPage() {
  return <RouteGuard allowedRole="OWNER"><BookingsAnalyticsInner /></RouteGuard>;
}
