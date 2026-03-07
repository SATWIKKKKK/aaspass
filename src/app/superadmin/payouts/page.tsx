"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, Search, Filter, ChevronLeft, ChevronRight, Loader2,
  Download, Eye, CheckCircle, Clock, XCircle, IndianRupee,
  CreditCard, TrendingUp, AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

interface PayoutRow {
  id: string;
  bookingAmount: number;
  commissionAmount: number;
  payoutAmount: number;
  payoutStatus: string;
  processedAt: string | null;
  createdAt: string;
  failureReason: string | null;
  owner: { id: string; name: string; email: string };
  booking: { id: string; property: { name: string } | null };
}

interface PayoutMetrics {
  totalProcessed: number;
  totalPending: number;
  totalFailed: number;
  totalAmount: number;
}

export default function SuperAdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [metrics, setMetrics] = useState<PayoutMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [detailPayout, setDetailPayout] = useState<PayoutRow | null>(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    try {
      const res = await fetch(`/api/superadmin/payouts?${params}`);
      const data = await res.json();
      setPayouts(data.payouts || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setMetrics(data.metrics || null);
    } catch {
      toast.error("Failed to load payouts");
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleManualPayout = async (payoutId: string) => {
    setProcessing(payoutId);
    try {
      const res = await fetch("/api/superadmin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Payout processed successfully");
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.message || "Failed to process payout");
    } finally {
      setProcessing(null);
    }
  };

  const exportCSV = () => {
    const params = new URLSearchParams({ format: "csv" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    window.open(`/api/superadmin/payouts?${params}`, "_blank");
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "PROCESSED": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "PENDING": return <Clock className="h-3 w-3 text-yellow-500" />;
      case "FAILED": return <XCircle className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "PROCESSED": return "bg-green-100 text-green-700";
      case "PENDING": return "bg-yellow-100 text-yellow-700";
      case "FAILED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payouts</h2>
          <p className="text-sm text-muted-foreground">Manage owner payouts</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="h-3.5 w-3.5" />Export CSV
        </Button>
      </div>

      {/* Metric Cards */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-4.5 w-4.5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Processed</p>
                  <p className="text-xl font-bold text-gray-900">{metrics.totalProcessed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-4.5 w-4.5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-gray-900">{metrics.totalPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <XCircle className="h-4.5 w-4.5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-xl font-bold text-gray-900">{metrics.totalFailed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <IndianRupee className="h-4.5 w-4.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid Out</p>
                  <p className="text-xl font-bold text-gray-900">{formatPrice(metrics.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchPayouts(); }} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by owner name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSED">Processed</option>
              <option value="FAILED">Failed</option>
            </select>
            <Button type="submit" size="sm" className="h-10"><Filter className="h-3.5 w-3.5 mr-1" />Filter</Button>
          </form>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">Owner</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Service</th>
                  <th className="text-right p-3 font-medium text-gray-600">Booking</th>
                  <th className="text-right p-3 font-medium text-gray-600">Commission</th>
                  <th className="text-right p-3 font-medium text-gray-600">Payout</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>
                      ))}
                    </tr>
                  ))
                ) : payouts.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-gray-500"><Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />No payouts found</td></tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-gray-900">{p.owner.name}</p>
                        <p className="text-xs text-muted-foreground">{p.owner.email}</p>
                      </td>
                      <td className="p-3 hidden md:table-cell text-gray-600 text-xs truncate max-w-[150px]">{p.booking.property?.name || "—"}</td>
                      <td className="p-3 text-right font-medium">{formatPrice(p.bookingAmount)}</td>
                      <td className="p-3 text-right text-red-600 text-xs">-{formatPrice(p.commissionAmount)}</td>
                      <td className="p-3 text-right font-bold text-green-700">{formatPrice(p.payoutAmount)}</td>
                      <td className="p-3">
                        <Badge className={cn("text-[10px] gap-1", statusColor(p.payoutStatus))}>
                          {statusIcon(p.payoutStatus)}{p.payoutStatus}
                        </Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell text-gray-600 text-xs">{formatDate(p.processedAt || p.createdAt)}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View details" onClick={() => setDetailPayout(p)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {p.payoutStatus === "PENDING" && (
                            <Button size="sm" variant="outline" className="h-8 text-xs" disabled={processing === p.id} onClick={() => handleManualPayout(p.id)}>
                              {processing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Process"}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {detailPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDetailPayout(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Payout Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Owner</span><span className="font-medium">{detailPayout.owner.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium">{detailPayout.booking.property?.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Booking Amount</span><span className="font-medium">{formatPrice(detailPayout.bookingAmount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Commission</span><span className="font-medium text-red-600">-{formatPrice(detailPayout.commissionAmount)}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-gray-500 font-medium">Payout Amount</span><span className="font-bold text-green-700">{formatPrice(detailPayout.payoutAmount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge className={cn("text-xs", statusColor(detailPayout.payoutStatus))}>{detailPayout.payoutStatus}</Badge></div>
              {detailPayout.failureReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{detailPayout.failureReason}</div>
              )}
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="text-xs">{formatDate(detailPayout.processedAt || detailPayout.createdAt)}</span></div>
            </div>
            <Button className="w-full mt-5" onClick={() => setDetailPayout(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
