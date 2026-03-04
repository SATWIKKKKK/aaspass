"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft, Calendar, ChevronLeft, ChevronRight, Loader2,
  User, Mail, Phone, CheckCircle, XCircle, Filter,
  Building2, MapPin,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice, formatDate } from "@/lib/utils";
import { RouteGuard } from "@/components/route-guard";

interface OwnerBooking {
  id: string; bookingNo: string; status: string; paymentStatus: string;
  checkIn: string; checkOut: string; totalDays: number;
  totalPrice: number; gstAmount: number; grandTotal: number;
  razorpayPaymentId: string | null; createdAt: string;
  property: { name: string; slug: string; city: string; serviceType: string; images: { url: string }[] };
  student: { name: string; email: string; phone: string | null };
}

function OwnerAllBookingsInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const limit = 10;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/bookings?${params}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const handleBookingAction = async (bookingId: string, action: "COMPLETED" | "CANCELLED") => {
    setUpdatingBooking(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (!res.ok) throw new Error();
      toast.success(action === "COMPLETED" ? "Booking completed!" : "Booking cancelled");
      fetchBookings();
    } catch {
      toast.error("Failed to update booking");
    } finally {
      setUpdatingBooking(null);
    }
  };

  const statusColors: Record<string, string> = {
    CONFIRMED: "success",
    ACTIVE: "success",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
    PENDING: "secondary",
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar variant="admin" />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Bookings</h1>
            <p className="text-sm text-gray-500">{total} total bookings</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-4 w-4 text-gray-400" />
              {["", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"].map((s) => (
                <Button
                  key={s || "ALL"}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className="text-xs"
                >
                  {s || "All"}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">No bookings found</h3>
              <p className="text-sm text-gray-500 mt-1">
                {statusFilter ? `No ${statusFilter.toLowerCase()} bookings.` : "When students book your services, they'll appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const isManageable = ["CONFIRMED", "ACTIVE"].includes(booking.status);
              return (
                <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-all">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Service Image */}
                      <div className="w-full sm:w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {booking.property.images?.[0]?.url ? (
                          <img src={booking.property.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{booking.student?.name || "Student"}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                              {booking.student?.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{booking.student.email}</span>}
                              {booking.student?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{booking.student.phone}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Service</span>
                            <Link href={`/admin/properties/${booking.property.slug}/manage`} className="font-medium text-primary hover:underline truncate ml-2">
                              {booking.property.name}
                            </Link>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Location</span>
                            <span className="text-gray-700 text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />{booking.property.city}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Dates</span>
                            <span className="text-gray-700 text-xs">
                              {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                              {" → "}
                              {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Amount</span>
                            <span className="font-semibold text-gray-900">{formatPrice(booking.grandTotal)}</span>
                          </div>
                          {booking.bookingNo && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Booking #</span>
                              <span className="text-gray-700 text-xs font-mono">{booking.bookingNo}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 shrink-0">
                        <Badge variant={statusColors[booking.status] as any || "secondary"} className="text-xs">
                          {booking.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDate(booking.createdAt)}</span>
                        {isManageable && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline"
                              className="text-xs h-8 text-green-700 border-green-200 hover:bg-green-50 active:scale-95 transition-all"
                              onClick={() => handleBookingAction(booking.id, "COMPLETED")}
                              disabled={updatingBooking === booking.id}
                            >
                              {updatingBooking === booking.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                              Complete
                            </Button>
                            <Button size="sm" variant="outline"
                              className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 active:scale-95 transition-all"
                              onClick={() => handleBookingAction(booking.id, "CANCELLED")}
                              disabled={updatingBooking === booking.id}
                            >
                              <XCircle className="h-3 w-3 mr-1" />Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between py-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({total} bookings)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Next<ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function OwnerAllBookingsPage() {
  return (
    <RouteGuard allowedRole="OWNER">
      <OwnerAllBookingsInner />
    </RouteGuard>
  );
}
