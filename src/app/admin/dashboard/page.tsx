"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus, ChevronDown, ChevronLeft, ChevronRight, Loader2,
  Settings, LogOut, LayoutDashboard, Building2, Pencil, BarChart3,
  Megaphone, Send, MapPin, Star, X, Eye, TrendingUp, ArrowRight,
  Ticket, Users, DollarSign, User, Calendar, CheckCircle, XCircle, Phone, Mail,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RouteGuard } from "@/components/route-guard";
import { cn, formatPrice } from "@/lib/utils";

/* ───── Types ───── */
interface PropertyImage { id: string; url: string; isWideShot: boolean; order: number }
interface PropertyData {
  id: string; name: string; slug: string; serviceType: string; status: string;
  price: number; gstRate: number; avgRating: number; totalReviews: number;
  city: string; address: string; images: PropertyImage[];
  _count?: { bookings: number };
}
interface OwnerStats {
  totalProperties: number; verifiedProperties: number;
  totalBookings: number; activeBookings: number; pendingBookings: number;
  completedBookings: number; cancelledBookings: number;
  totalRevenue: number; avgRating: number; totalReviews: number;
  totalComplaints: number; openComplaints: number;
  totalAnnouncements: number;
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
}

interface OwnerBooking {
  id: string;
  bookingNo: string;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  totalDays: number;
  totalPrice: number;
  gstAmount: number;
  grandTotal: number;
  razorpayPaymentId: string | null;
  createdAt: string;
  property: { name: string; slug: string; serviceType: string; images: { url: string }[] };
  student: { name: string; email: string; phone: string | null };
}

/* ───── Image Carousel ───── */
function ImageCarousel({ images, className }: { images: PropertyImage[]; className?: string }) {
  const [idx, setIdx] = useState(0);
  const imgs = images.length > 0 ? images : [{ id: "ph", url: "", isWideShot: false, order: 0 }];
  return (
    <div className={cn("relative group overflow-hidden bg-gray-100", className)}>
      {imgs[idx]?.url ? (
        <img src={imgs[idx].url} alt="" className="w-full h-full object-cover transition-all duration-300" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-primary/10 to-primary/5">
          <Building2 className="h-10 w-10 text-primary/30" />
        </div>
      )}
      {imgs.length > 1 && (
        <>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i - 1 + imgs.length) % imgs.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-7 sm:w-7 rounded-full bg-white/80 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow">
            <ChevronLeft className="h-4 w-4 text-gray-700" />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i + 1) % imgs.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-7 sm:w-7 rounded-full bg-white/80 flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow">
            <ChevronRight className="h-4 w-4 text-gray-700" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imgs.map((_, i) => (
              <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i); }}
                className={cn("h-2 w-2 rounded-full transition-all cursor-pointer", i === idx ? "bg-white w-4" : "bg-white/60")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ───── Announcement Modal ───── */
function AnnouncementModal({ open, onClose, property }: {
  open: boolean; onClose: () => void; property: PropertyData | null;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  if (!open || !property) return null;

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) { toast.error("Fill both title and message"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, propertyId: property.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Announcement sent! ${data.notifiedCount || 0} student(s) notified`);
        setTitle(""); setContent(""); onClose();
      } else toast.error(data.error || "Failed to send");
    } catch { toast.error("Something went wrong"); }
    finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />Send Announcement
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">To students booked at <span className="font-medium">{property.name}</span></p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><Label className="text-sm font-medium">Title</Label><Input placeholder="e.g. Water Supply Update" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-sm font-medium">Message</Label><Textarea placeholder="Write your announcement details..." rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send Announcement</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN DASHBOARD ═══════════════════ */
function AdminDashboardInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [ownerBookings, setOwnerBookings] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [announceProp, setAnnounceProp] = useState<PropertyData | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);

  const userName = session?.user?.name ? session.user.name.split(" ")[0] : "Owner";

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/properties?owner=me").then((r) => r.json()),
      fetch("/api/owner/stats").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
    ]).then(([propData, statsData, bookingsData]) => {
      setProperties(propData.properties || []);
      if (!statsData.error) setStats(statsData);
      setOwnerBookings(bookingsData.bookings || []);
    }).catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    const handler = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [profileOpen]);

  if (status === "loading" || loading)
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const displayProperties = properties.slice(0, 2);

  const handleBookingAction = async (bookingId: string, action: "COMPLETED" | "CANCELLED") => {
    const label = action === "COMPLETED" ? "mark as completed" : "cancel";
    if (!confirm(`Are you sure you want to ${label} this booking?`)) return;
    setUpdatingBooking(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        setOwnerBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: action, paymentStatus: action === "CANCELLED" ? "refund_pending" : b.paymentStatus } : b))
        );
        toast.success(action === "COMPLETED" ? "Booking marked as completed" : "Booking cancelled");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update booking");
      }
    } catch { toast.error("Something went wrong"); }
    finally { setUpdatingBooking(null); }
  };

  return (
    <div className="min-h-screen bg-white">
      <AnnouncementModal open={!!announceProp} onClose={() => setAnnounceProp(null)} property={announceProp} />

      {/* ── NAVBAR ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
              <span className="text-xl font-bold text-gray-900">AasPass</span>
            </Link>
            {session ? (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 h-10 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                  <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "O"}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-60">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{session.user?.name}</p>
                      <p className="text-xs text-gray-500">{session.user?.email}</p>
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] mt-1"><Building2 className="h-3 w-3 mr-0.5" />Owner</Badge>
                    </div>
                    <Link href="/settings/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                      <User className="h-4 w-4 text-gray-400" /> Personal Details
                    </Link>
                    <Link href="/admin/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 text-gray-400" /> Dashboard
                    </Link>
                    <Link href="/admin/properties" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                      <Building2 className="h-4 w-4 text-gray-400" /> My Properties
                    </Link>
                    <Link href="/admin/properties/new" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                      <Plus className="h-4 w-4 text-gray-400" /> Add Property
                    </Link>
                    <Link href="/settings/edit" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileOpen(false)}>
                      <Settings className="h-4 w-4 text-gray-400" /> Settings
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={() => signOut({ callbackUrl: "/home" })} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login"><Button variant="outline" size="sm">Sign In</Button></Link>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div className="text-center pt-8 pb-4">
        <h1 className="font-black tracking-tight text-primary text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none select-none">
          Aas<span className="text-premium">Pass</span>
        </h1>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Hello {userName}</h2>
          <p className="text-gray-600 mt-1">Manage your properties, track bookings, and grow your business.</p>
        </div>

        {/* ═══ YOUR PROPERTIES ═══ */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Your Properties</h3>
            {properties.length > 2 && (
              <Link href="/admin/properties" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View All ({properties.length}) <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Add Property — fixed width */}
            <Link href="/admin/properties/new" className="block shrink-0 lg:w-64 xl:w-72">
              <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer h-full">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-55">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <p className="font-semibold text-gray-900 text-lg">Add Property</p>
                  <p className="text-sm text-gray-500 mt-1">List a new hostel, PG, gym...</p>
                </CardContent>
              </Card>
            </Link>

            {/* Property Cards — stretch to fill */}
            {properties.length === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-55">
                <Card className="border-2 border-dashed border-gray-200 w-full h-full">
                  <CardContent className="p-12 text-center flex flex-col items-center justify-center h-full">
                    <Building2 className="h-12 w-12 text-gray-300 mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900">No properties yet</h4>
                    <p className="text-sm text-gray-500 mt-1">Click &quot;Add Property&quot; to list your first one</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row gap-6 min-w-0">
                {displayProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onAnnounce={() => setAnnounceProp(property)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═══ RECENT BOOKINGS ═══ */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Bookings</h3>

          {ownerBookings.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                <h4 className="text-lg font-semibold text-gray-900">No bookings yet</h4>
                <p className="text-sm text-gray-500 mt-1">When students book your properties, they&apos;ll appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {ownerBookings.slice(0, 6).map((booking) => {
                const isManageable = ["CONFIRMED", "ACTIVE"].includes(booking.status);
                return (
                  <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Left: Guest + Property Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{booking.student?.name || "Student"}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                                {booking.student?.email && (
                                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{booking.student.email}</span>
                                )}
                                {booking.student?.phone && (
                                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{booking.student.phone}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1.5 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Property</span>
                              <span className="font-medium text-gray-900 truncate ml-2">{booking.property.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Booking ID</span>
                              <span className="font-mono text-xs text-gray-700">{booking.bookingNo || "—"}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Dates</span>
                              <span className="text-gray-700 text-xs">
                                {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                {" → "}
                                {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                {booking.totalDays > 0 && ` (${booking.totalDays}d)`}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Amount</span>
                              <span className="font-semibold text-green-700">{formatPrice(booking.grandTotal)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Status + Actions */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 shrink-0">
                          <Badge
                            variant={
                              ["ACTIVE", "CONFIRMED"].includes(booking.status)
                                ? "success"
                                : booking.status === "COMPLETED"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {booking.status}
                          </Badge>

                          {isManageable && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 text-green-700 border-green-200 hover:bg-green-50"
                                onClick={() => handleBookingAction(booking.id, "COMPLETED")}
                                disabled={updatingBooking === booking.id}
                              >
                                {updatingBooking === booking.id ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleBookingAction(booking.id, "CANCELLED")}
                                disabled={updatingBooking === booking.id}
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {ownerBookings.length > 6 && (
                <p className="text-sm text-gray-500 text-center">Showing 6 of {ownerBookings.length} bookings</p>
              )}
            </div>
          )}
        </section>

        {/* ═══ BUSINESS STATS ═══ */}
        <section className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Business Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Dynamic Business Stats */}
            <Card className="bg-linear-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-blue-600" />Business Stats</CardTitle>
                <CardDescription>Your performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-blue-700">{stats?.totalProperties || 0}</p>
                    <p className="text-xs text-gray-500">Properties</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{formatPrice(stats?.totalRevenue || 0)}</p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-700">{stats?.activeBookings || 0}</p>
                    <p className="text-xs text-gray-500">Active Bookings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-700">{stats?.avgRating?.toFixed(1) || "0.0"}</p>
                    <p className="text-xs text-gray-500">Avg Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Insights */}
            <Card className="bg-linear-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-green-600" />Insights</CardTitle>
                <CardDescription>Quick performance snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-green-100">
                    <div><p className="text-sm font-semibold text-gray-900">Total Bookings</p><p className="text-[10px] text-gray-500">Across all properties</p></div>
                    <span className="text-lg font-bold text-green-700">{stats?.totalBookings || 0}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-green-100">
                    <div><p className="text-sm font-semibold text-gray-900">Completion Rate</p><p className="text-[10px] text-gray-500">Completed vs total</p></div>
                    <span className="text-lg font-bold text-blue-700">{stats?.totalBookings ? Math.round(((stats?.completedBookings || 0) / stats.totalBookings) * 100) : 0}%</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-green-100">
                    <div><p className="text-sm font-semibold text-gray-900">Total Reviews</p><p className="text-[10px] text-gray-500">From students</p></div>
                    <span className="text-lg font-bold text-amber-700">{stats?.totalReviews || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support & Actions */}
            <Card className="bg-linear-to-br from-amber-50 to-yellow-50 border-amber-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Ticket className="h-5 w-5 text-amber-600" />Activity Summary</CardTitle>
                <CardDescription>Complaints & announcements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                    <div><p className="text-sm font-semibold text-gray-900">Open Complaints</p><p className="text-[10px] text-gray-500">Needing attention</p></div>
                    <Badge className={`text-[10px] ${(stats?.openComplaints || 0) > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{stats?.openComplaints || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                    <div><p className="text-sm font-semibold text-gray-900">Pending Bookings</p><p className="text-[10px] text-gray-500">Awaiting confirmation</p></div>
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">{stats?.pendingBookings || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                    <div><p className="text-sm font-semibold text-gray-900">Announcements</p><p className="text-[10px] text-gray-500">Sent to students</p></div>
                    <span className="text-lg font-bold text-amber-700">{stats?.totalAnnouncements || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

/* ═══════════════════ PROPERTY CARD ═══════════════════ */
function PropertyCard({ property, onAnnounce }: { property: PropertyData; onAnnounce: () => void }) {
  return (
    <Card className="flex-1 min-w-0 overflow-hidden hover:shadow-lg transition-shadow h-full min-h-55">
      <div className="flex flex-col sm:flex-row h-full">
        {/* Left: images */}
        <ImageCarousel
          images={property.images}
          className="w-full sm:w-40 md:w-48 lg:w-52 h-48 sm:h-auto shrink-0 rounded-t-xl sm:rounded-t-none sm:rounded-l-xl"
        />

        {/* Right: info + action buttons */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-gray-900 text-base truncate">{property.name}</h4>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />{property.address}, {property.city}
                </p>
              </div>
              <Badge
                variant={property.status === "VERIFIED" ? "success" : property.status === "PENDING" ? "secondary" : "destructive"}
                className="text-[10px] shrink-0"
              >
                {property.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
              <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{property.avgRating.toFixed(1)}</span>
              <span>{formatPrice(property.price)}/mo</span>
              <span className="capitalize">{property.serviceType.toLowerCase()}</span>
            </div>
          </div>

          {/* Action buttons — 2×2 grid */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Link href={`/admin/properties/${property.slug}/manage?tab=edit`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs h-8"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
              </Link>
              <Link href={`/admin/properties/${property.slug}/manage`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs h-8"><Eye className="h-3 w-3 mr-1" />Manage</Button>
              </Link>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/properties/${property.slug}/manage?tab=analytics`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full text-xs h-8"><BarChart3 className="h-3 w-3 mr-1" />Analysis</Button>
              </Link>
              <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={onAnnounce}>
                <Megaphone className="h-3 w-3 mr-1" />Announce
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  return (
    <RouteGuard allowedRole="OWNER">
      <AdminDashboardInner />
    </RouteGuard>
  );
}
