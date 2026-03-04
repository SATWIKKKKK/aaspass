"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, ChevronLeft, ChevronRight, CalendarCheck, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function SuperAdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState("");

  // Detail modal
  const [selected, setSelected] = useState<any>(null);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (bookingStatus) params.set("bookingStatus", bookingStatus);

    try {
      const res = await fetch(`/api/superadmin/bookings?${params}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  }, [page, search, paymentStatus, bookingStatus]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleAction = async (bookingId: string, action: string) => {
    const reason = prompt("Reason (optional):");
    setActionLoading(bookingId);
    try {
      const res = await fetch("/api/superadmin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action, reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Booking updated");
      fetchBookings();
      setSelected(null);
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Booking Management</h2>
        <p className="text-sm text-muted-foreground">{total.toLocaleString()} total bookings</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchBookings(); }} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by booking ID, student, or service..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Payment</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <select value={bookingStatus} onChange={(e) => { setBookingStatus(e.target.value); setPage(1); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <Button type="submit" size="sm" className="h-10"><Filter className="h-3.5 w-3.5 mr-1" />Filter</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">Booking</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Student</th>
                  <th className="text-left p-3 font-medium text-gray-600">Service</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Owner</th>
                  <th className="text-left p-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left p-3 font-medium text-gray-600">Payment</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Date</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 9 }).map((_, j) => <td key={j} className="p-3"><Skeleton className="h-5 w-20" /></td>)}
                    </tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-500"><CalendarCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />No bookings found</td></tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 font-mono text-xs">{b.bookingNo?.slice(0, 12)}...</td>
                      <td className="p-3 hidden md:table-cell">{b.student?.name}</td>
                      <td className="p-3 font-medium text-gray-900">{b.property?.name}</td>
                      <td className="p-3 hidden lg:table-cell text-gray-600">{b.property?.owner?.name}</td>
                      <td className="p-3 font-medium">{formatPrice(b.grandTotal)}</td>
                      <td className="p-3">
                        <Badge variant={b.paymentStatus === "paid" ? "success" : b.paymentStatus === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                          {b.paymentStatus}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={["ACTIVE", "CONFIRMED"].includes(b.status) ? "success" : b.status === "CANCELLED" ? "destructive" : "secondary"} className="text-[10px]">
                          {b.status}
                        </Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell text-xs text-gray-600">{formatDate(b.createdAt)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelected(b)}>
                          Details
                        </Button>
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
      {selected && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Booking No</span><span className="font-mono text-xs">{selected.bookingNo}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Student</span><span>{selected.student?.name} ({selected.student?.email})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{selected.property?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span>{selected.property?.owner?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span>{selected.planLabel || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{formatPrice(selected.grandTotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-in</span><span>{formatDate(selected.checkIn)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Check-out</span><span>{formatDate(selected.checkOut)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Razorpay Payment ID</span><span className="font-mono text-xs">{selected.razorpayPaymentId || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment Status</span>
                <Badge variant={selected.paymentStatus === "paid" ? "success" : "secondary"} className="text-[10px]">{selected.paymentStatus}</Badge>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Booking Status</span>
                <Badge variant={["ACTIVE", "CONFIRMED"].includes(selected.status) ? "success" : "secondary"} className="text-[10px]">{selected.status}</Badge>
              </div>
            </div>
            <div className="flex gap-2 mt-6 flex-wrap">
              {selected.paymentStatus !== "paid" && (
                <Button size="sm" variant="outline" onClick={() => handleAction(selected.id, "mark-paid")} disabled={!!actionLoading}>
                  {actionLoading === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Mark as Paid
                </Button>
              )}
              {!["CANCELLED"].includes(selected.status) && (
                <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleAction(selected.id, "cancel")} disabled={!!actionLoading}>
                  Cancel Booking
                </Button>
              )}
              {selected.paymentStatus === "paid" && (
                <Button size="sm" variant="outline" onClick={() => handleAction(selected.id, "refund")} disabled={!!actionLoading}>
                  Mark Refunded
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(null)} className="ml-auto">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
