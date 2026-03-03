"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Plus, ChevronDown, ChevronLeft, ChevronRight, Loader2,
  Settings, LogOut, LayoutDashboard, Building2, Pencil, BarChart3,
  Megaphone, Send, MapPin, Star, X, Eye, TrendingUp, ArrowRight,
  Ticket, Users, User, Calendar, CheckCircle, XCircle, Phone, Mail,
  MousePointerClick, Heart, ShoppingCart, Bell, Upload, UserPlus,
  Minus, Activity, BookOpen, Armchair, AlertCircle,
  Sparkles,
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

/* ═══════════════════ TYPES ═══════════════════ */
interface PropertyImage { id: string; url: string; isWideShot: boolean; order: number }
interface PropertyData {
  id: string; name: string; slug: string; serviceType: string; status: string;
  price: number; gstRate: number; avgRating: number; totalReviews: number;
  city: string; address: string; images: PropertyImage[];
  capacity?: number | null; availableRooms?: number | null;
  totalViews?: number;
  _count?: { bookings: number; serviceStudents: number; wishlistItems: number };
}
interface OwnerStats {
  totalProperties: number; verifiedProperties: number;
  totalBookings: number; activeBookings: number; pendingBookings: number;
  completedBookings: number; cancelledBookings: number;
  totalRevenue: number; avgRating: number; totalReviews: number;
  totalComplaints: number; openComplaints: number;
  totalAnnouncements: number;
  totalStudents: number; totalCapacity: number; totalAvailable: number;
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
  propertyStats: any[];
}
interface MonthlyVisibility {
  month: string; label: string;
  clicks: number; uniqueVisitors: number; wishlistAdds: number; cartAdds: number;
}
interface VisibilityStats {
  allTime: { totalClicks: number; uniqueVisitors: number; wishlistAdds: number; cartAdds: number };
  monthly: MonthlyVisibility[];
}
interface OwnerBooking {
  id: string; bookingNo: string; status: string; paymentStatus: string;
  checkIn: string; checkOut: string; totalDays: number;
  totalPrice: number; gstAmount: number; grandTotal: number;
  razorpayPaymentId: string | null; createdAt: string;
  property: { name: string; slug: string; serviceType: string; images: { url: string }[] };
  student: { name: string; email: string; phone: string | null };
}
interface NotificationItem {
  id: string; title: string; message: string; isRead: boolean;
  type: string | null; link: string | null; createdAt: string;
}

/* ═══════════════════ ANIMATED COUNTER ═══════════════════ */
function AnimatedCounter({ value, duration = 1200, className }: { value: number; duration?: number; className?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);
  return <span className={className}>{display.toLocaleString()}</span>;
}

/* ═══════════════════ IMAGE CAROUSEL ═══════════════════ */
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
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
            <ChevronLeft className="h-4 w-4 text-gray-700" />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx((i) => (i + 1) % imgs.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
            <ChevronRight className="h-4 w-4 text-gray-700" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {imgs.map((_, i) => (
              <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIdx(i); }}
                className={cn("h-1.5 w-1.5 rounded-full transition-all", i === idx ? "bg-white w-3" : "bg-white/60")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════ ANNOUNCEMENT MODAL ═══════════════════ */
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
      if (res.ok) { toast.success(`Announcement sent! ${data.notifiedCount || 0} student(s) notified`); setTitle(""); setContent(""); onClose(); }
      else toast.error(data.error || "Failed");
    } catch { toast.error("Something went wrong"); }
    finally { setSending(false); }
  };
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Send Announcement</h3>
            <p className="text-sm text-gray-500 mt-0.5">To students at <span className="font-medium">{property.name}</span></p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div><Label className="text-sm font-medium">Title</Label><Input placeholder="e.g. Water Supply Update" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" /></div>
          <div><Label className="text-sm font-medium">Message</Label><Textarea placeholder="Write your announcement details..." rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="transition-transform active:scale-95">
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ QUICK SEAT UPDATE MODAL ═══════════════════ */
function SeatUpdateModal({ open, onClose, property, onUpdate }: {
  open: boolean; onClose: () => void; property: PropertyData | null;
  onUpdate: (slug: string, available: number) => void;
}) {
  const [seats, setSeats] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (property) setSeats(property.availableRooms ?? 0); }, [property]);
  if (!open || !property) return null;

  const capacity = property.capacity ?? 0;
  const occupied = capacity - seats;
  const pct = capacity > 0 ? Math.round((occupied / capacity) * 100) : 0;
  const color = pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green";
  const colorMap = { red: "bg-red-500", yellow: "bg-yellow-500", green: "bg-green-500" };
  const textMap = { red: "text-red-700", yellow: "text-yellow-700", green: "text-green-700" };
  const bgMap = { red: "bg-red-50", yellow: "bg-yellow-50", green: "bg-green-50" };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${property.slug}/seats`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableRooms: seats }),
      });
      if (res.ok) { toast.success("Seats updated!"); onUpdate(property.slug, seats); onClose(); }
      else { const d = await res.json(); toast.error(d.error || "Failed"); }
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Armchair className="h-5 w-5 text-primary" />Update Available Seats
          </h3>
          <p className="text-sm text-gray-500 mt-1">{property.name}</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setSeats(Math.max(0, seats - 1))}
              className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-primary flex items-center justify-center transition-all active:scale-90">
              <Minus className="h-5 w-5" />
            </button>
            <div className="text-center">
              <input type="number" value={seats} min={0} max={capacity || 9999}
                onChange={(e) => setSeats(Math.max(0, Math.min(capacity || 9999, parseInt(e.target.value) || 0)))}
                className="text-4xl font-black text-center w-24 border-0 outline-none bg-transparent" />
              <p className="text-xs text-gray-400 mt-1">available seats</p>
            </div>
            <button onClick={() => setSeats(Math.min(capacity || 9999, seats + 1))}
              className="h-12 w-12 rounded-full border-2 border-gray-200 hover:border-primary flex items-center justify-center transition-all active:scale-90">
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Status Summary */}
          {capacity > 0 && (
            <div className={cn("rounded-xl p-4", bgMap[color])}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-sm font-semibold", textMap[color])}>
                  {occupied} of {capacity} seats occupied
                </span>
                <span className={cn("text-sm font-bold", textMap[color])}>{seats} remaining</span>
              </div>
              <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", colorMap[color])} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="transition-transform active:scale-95">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ VISIBILITY CHART ═══════════════════ */
function VisibilityChart({ monthly }: { monthly: MonthlyVisibility[] }) {
  const metrics: { key: keyof MonthlyVisibility; label: string; color: string }[] = [
    { key: "clicks", label: "Clicks", color: "#3b82f6" },
    { key: "uniqueVisitors", label: "Unique", color: "#8b5cf6" },
    { key: "wishlistAdds", label: "Wishlisted", color: "#f43f5e" },
    { key: "cartAdds", label: "Cart", color: "#f97316" },
  ];
  const maxVal = Math.max(1, ...monthly.flatMap((m) => metrics.map((mt) => (m[mt.key] as number) ?? 0)));
  const BAR_H = 120;
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-2">
      <div className="flex items-end gap-2 min-w-max">
        {monthly.map((m) => {
          const isCurrent = m.month === currentMonth;
          return (
            <div key={m.month} className={cn(
              "flex flex-col items-center gap-1 px-1.5 pb-1 rounded-lg transition-colors",
              isCurrent ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-gray-50"
            )}>
              <div className="flex items-end gap-0.5" style={{ height: BAR_H }}>
                {metrics.map((mt) => {
                  const val = (m[mt.key] as number) ?? 0;
                  const h = Math.max(2, Math.round((val / maxVal) * BAR_H));
                  return (
                    <div key={mt.key} title={`${mt.label}: ${val}`}
                      className="w-3 rounded-t-sm cursor-default transition-all duration-500 hover:opacity-80"
                      style={{ height: h, backgroundColor: mt.color }} />
                  );
                })}
              </div>
              <span className={cn("text-[10px] whitespace-nowrap font-medium", isCurrent ? "text-primary" : "text-gray-400")}>
                {m.label}
              </span>
              {isCurrent && <span className="text-[8px] bg-primary text-white rounded-full px-1.5 py-0.5 font-bold leading-none">NOW</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════ SEAT INDICATOR (inline) ═══════════════════ */
function SeatIndicator({ capacity, available }: { capacity: number | null | undefined; available: number | null | undefined }) {
  if (!capacity) return null;
  const avail = available ?? 0;
  const occupied = capacity - avail;
  const pct = Math.round((occupied / capacity) * 100);
  const color = pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green";
  const tagColor = { red: "bg-red-100 text-red-700", yellow: "bg-yellow-100 text-yellow-700", green: "bg-green-100 text-green-700" };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full", tagColor[color])}>
      <Armchair className="h-3 w-3" />{avail}/{capacity}
      {pct >= 90 && <span className="ml-0.5 animate-pulse">!</span>}
    </span>
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
  const [seatProp, setSeatProp] = useState<PropertyData | null>(null);
  const [updatingBooking, setUpdatingBooking] = useState<string | null>(null);
  const [visibilityStats, setVisibilityStats] = useState<VisibilityStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  const userName = session?.user?.name ? session.user.name.split(" ")[0] : "Owner";
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/properties?owner=me").then((r) => r.json()),
      fetch("/api/owner/stats").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/owner/visibility-stats").then((r) => r.json()),
      fetch("/api/notifications").then((r) => r.json()).catch(() => ({ notifications: [] })),
    ]).then(([propData, statsData, bookingsData, visData, notifData]) => {
      setProperties(propData.properties || []);
      if (!statsData.error) setStats(statsData);
      setOwnerBookings(bookingsData.bookings || []);
      if (!visData.error) setVisibilityStats(visData);
      setNotifications(notifData.notifications || []);
    }).catch(() => toast.error("Failed to load data"))
      .finally(() => { setLoading(false); setTimeout(() => setContentReady(true), 100); });
  }, [status]);

  useEffect(() => {
    const handler = () => { setProfileOpen(false); setShowNotifs(false); };
    if (profileOpen || showNotifs) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [profileOpen, showNotifs]);

  const handleSeatUpdate = (slug: string, newAvailable: number) => {
    setProperties((prev) => prev.map((p) => p.slug === slug ? { ...p, availableRooms: newAvailable } : p));
  };

  const handleBookingAction = async (bookingId: string, action: "COMPLETED" | "CANCELLED") => {
    const label = action === "COMPLETED" ? "mark as completed" : "cancel";
    if (!confirm(`Are you sure you want to ${label} this booking?`)) return;
    setUpdatingBooking(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        setOwnerBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: action, paymentStatus: action === "CANCELLED" ? "refund_pending" : b.paymentStatus } : b))
        );
        toast.success(action === "COMPLETED" ? "Booking completed" : "Booking cancelled");
      } else { const data = await res.json(); toast.error(data.error || "Failed"); }
    } catch { toast.error("Something went wrong"); }
    finally { setUpdatingBooking(null); }
  };

  if (status === "loading" || loading)
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const thisMonthVis = visibilityStats?.monthly.at(-1);
  const confirmedThisMonth = ownerBookings.filter((b) => {
    const d = new Date(b.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && ["CONFIRMED", "ACTIVE", "COMPLETED"].includes(b.status);
  }).length;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AnnouncementModal open={!!announceProp} onClose={() => setAnnounceProp(null)} property={announceProp} />
      <SeatUpdateModal open={!!seatProp} onClose={() => setSeatProp(null)} property={seatProp} onUpdate={handleSeatUpdate} />

      {/* ── NAVBAR ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
              <span className="text-xl font-bold text-gray-900">AasPass</span>
              <Badge className="bg-blue-100 text-blue-700 text-[10px] ml-1">Owner</Badge>
            </Link>
            <div className="flex items-center gap-3">
              {/* Notifications Bell */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => { setShowNotifs(!showNotifs); setProfileOpen(false); }}
                  className="relative h-10 w-10 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors">
                  <Bell className="h-4.5 w-4.5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-in zoom-in duration-200">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifs && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-60 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 text-sm">Notifications</h4>
                      {unreadCount > 0 && <Badge className="bg-red-100 text-red-700 text-[10px]">{unreadCount} new</Badge>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
                      ) : notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={cn("px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors", !n.isRead && "bg-blue-50/50")}>
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        </div>
                      ))}
                    </div>
                    <Link href="/notifications" className="block px-4 py-2.5 text-center text-xs font-medium text-primary hover:bg-gray-50 border-t">
                      View All Notifications
                    </Link>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              {session && (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setProfileOpen(!profileOpen); setShowNotifs(false); }}
                    className="flex items-center gap-2 h-10 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                    <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "O"}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-60 animate-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{session.user?.name}</p>
                        <p className="text-xs text-gray-500">{session.user?.email}</p>
                      </div>
                      <Link href="/settings/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><User className="h-4 w-4 text-gray-400" /> Profile</Link>
                      <Link href="/admin/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><LayoutDashboard className="h-4 w-4 text-gray-400" /> Dashboard</Link>
                      <Link href="/admin/properties" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Building2 className="h-4 w-4 text-gray-400" /> My Services</Link>
                      <Link href="/settings/edit" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Settings className="h-4 w-4 text-gray-400" /> Settings</Link>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={() => signOut({ callbackUrl: "/home" })} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── GREETING + TRUST BANNER ── */}
        <div className={cn("mb-6 transition-all duration-500", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Hello {userName} 👋</h2>
          <p className="text-gray-500 mt-1">Here&apos;s how your services are performing today.</p>
        </div>

        {/* ── TRUST BANNER ── */}
        {visibilityStats && (visibilityStats.allTime.totalClicks > 0 || (stats?.totalBookings ?? 0) > 0) && (
          <div className={cn("mb-6 bg-linear-to-r from-primary/5 via-blue-50 to-indigo-50 border border-primary/10 rounded-2xl p-4 sm:p-5 transition-all duration-700", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">AasPass is actively working for you</p>
                <p className="text-sm text-gray-600 mt-1">
                  This month, AasPass brought <strong className="text-primary">{thisMonthVis?.uniqueVisitors ?? 0} students</strong> to view your services
                  {confirmedThisMonth > 0 && <> and helped convert <strong className="text-green-700">{confirmedThisMonth} bookings</strong></>}.
                  {(thisMonthVis?.wishlistAdds ?? 0) > 0 && <> <strong className="text-rose-600">{thisMonthVis?.wishlistAdds}</strong> students wishlisted your service!</>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════ QUICK ACTION BAR ══════ */}
        <div className={cn("mb-8 transition-all duration-500 delay-100", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {properties.length > 0 && (
              <Button onClick={() => setSeatProp(properties[0])} variant="outline"
                className="gap-2 bg-white hover:bg-primary/5 hover:border-primary/30 border-gray-200 shadow-sm transition-all active:scale-95">
                <Armchair className="h-4 w-4 text-primary" />Update Seats
              </Button>
            )}
            <Link href="/admin/properties/new">
              <Button variant="outline" className="gap-2 bg-white hover:bg-primary/5 hover:border-primary/30 border-gray-200 shadow-sm transition-all active:scale-95">
                <Plus className="h-4 w-4 text-primary" />Add New Service
              </Button>
            </Link>
            {properties.length > 0 && (
              <>
                <Link href={`/admin/properties/${properties[0].slug}/manage?tab=students`}>
                  <Button variant="outline" className="gap-2 bg-white hover:bg-primary/5 hover:border-primary/30 border-gray-200 shadow-sm transition-all active:scale-95">
                    <UserPlus className="h-4 w-4 text-primary" />Add Student
                  </Button>
                </Link>
                <Link href={`/admin/properties/${properties[0].slug}/manage?tab=bookings`}>
                  <Button variant="outline" className="gap-2 bg-white hover:bg-primary/5 hover:border-primary/30 border-gray-200 shadow-sm transition-all active:scale-95">
                    <BookOpen className="h-4 w-4 text-primary" />View Bookings
                  </Button>
                </Link>
                <Link href={`/admin/properties/${properties[0].slug}/manage?tab=students`}>
                  <Button variant="outline" className="gap-2 bg-white hover:bg-primary/5 hover:border-primary/30 border-gray-200 shadow-sm transition-all active:scale-95">
                    <Upload className="h-4 w-4 text-primary" />Upload Student List
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ══════ PERFORMANCE & VISIBILITY (TOP — MOST PROMINENT) ══════ */}
        <section className={cn("mb-10 transition-all duration-600 delay-200", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <div className="mb-5">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />Your Visibility & Performance
            </h3>
            <p className="text-sm text-gray-500 mt-1">See the reach AasPass is giving your service</p>
          </div>

          {/* Top-tier Visibility Metrics — large, prominent */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-200 flex items-center justify-center">
                    <MousePointerClick className="h-5 w-5 text-blue-700" />
                  </div>
                  <Badge className="text-[10px] bg-white/70 text-blue-600 border border-blue-200">
                    {thisMonthVis?.clicks ?? 0} this mo
                  </Badge>
                </div>
                <p className="text-3xl font-black text-blue-700">
                  <AnimatedCounter value={visibilityStats?.allTime.totalClicks ?? 0} />
                </p>
                <p className="text-xs font-semibold text-blue-600 mt-1">Total Clicks</p>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-purple-50 to-purple-100/50 border-purple-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-200 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-700" />
                  </div>
                  <Badge className="text-[10px] bg-white/70 text-purple-600 border border-purple-200">
                    {thisMonthVis?.uniqueVisitors ?? 0} this mo
                  </Badge>
                </div>
                <p className="text-3xl font-black text-purple-700">
                  <AnimatedCounter value={visibilityStats?.allTime.uniqueVisitors ?? 0} />
                </p>
                <p className="text-xs font-semibold text-purple-600 mt-1">Unique Visitors</p>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-rose-50 to-rose-100/50 border-rose-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-rose-200 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-rose-700" />
                  </div>
                  <Badge className="text-[10px] bg-white/70 text-rose-600 border border-rose-200">
                    {thisMonthVis?.wishlistAdds ?? 0} this mo
                  </Badge>
                </div>
                <p className="text-3xl font-black text-rose-700">
                  <AnimatedCounter value={visibilityStats?.allTime.wishlistAdds ?? 0} />
                </p>
                <p className="text-xs font-semibold text-rose-600 mt-1">Wishlisted</p>
                <p className="text-[10px] text-rose-500 mt-0.5">{visibilityStats?.allTime.wishlistAdds ?? 0} students wishlisted your service</p>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-orange-50 to-orange-100/50 border-orange-200 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-orange-200 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-orange-700" />
                  </div>
                  <Badge className="text-[10px] bg-white/70 text-orange-600 border border-orange-200">
                    {thisMonthVis?.cartAdds ?? 0} this mo
                  </Badge>
                </div>
                <p className="text-3xl font-black text-orange-700">
                  <AnimatedCounter value={visibilityStats?.allTime.cartAdds ?? 0} />
                </p>
                <p className="text-xs font-semibold text-orange-600 mt-1">Added to Cart</p>
                <p className="text-[10px] text-orange-500 mt-0.5">{visibilityStats?.allTime.cartAdds ?? 0} students added to cart</p>
              </CardContent>
            </Card>
          </div>

          {/* Booking & Occupancy Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-6 w-6 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700"><AnimatedCounter value={confirmedThisMonth} /></p>
                  <p className="text-xs text-gray-500">Confirmed bookings this month</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <Armchair className="h-6 w-6 text-indigo-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-700">
                    <AnimatedCounter value={stats?.totalAvailable ?? 0} /> / <AnimatedCounter value={stats?.totalCapacity ?? 0} />
                  </p>
                  <p className="text-xs text-gray-500">Available seats / Total capacity</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700"><AnimatedCounter value={stats?.totalStudents ?? 0} /></p>
                  <p className="text-xs text-gray-500">Registered students</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend Chart */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-gray-500" />Monthly Trend — Last 12 Months
              </CardTitle>
              <CardDescription>
                <span className="inline-flex items-center gap-3 flex-wrap text-xs">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />Clicks</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-purple-500" />Unique</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-rose-500" />Wishlisted</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-orange-500" />Cart</span>
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visibilityStats?.monthly && visibilityStats.monthly.length > 0 ? (
                <VisibilityChart monthly={visibilityStats.monthly} />
              ) : (
                <div className="h-36 flex items-center justify-center text-gray-400 text-sm">
                  No engagement data yet — share your services to start tracking
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ══════ SERVICE MANAGEMENT CARDS ══════ */}
        <section className={cn("mb-10 transition-all duration-600 delay-300", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />Your Services
            </h3>
            {properties.length > 2 && (
              <Link href="/admin/properties" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View All ({properties.length}) <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {/* Add Service Card */}
            <Link href="/admin/properties/new" className="block">
              <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer h-full hover:shadow-md">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-48">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Plus className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-semibold text-gray-900">Add New Service</p>
                  <p className="text-sm text-gray-500 mt-1">List a hostel, PG, gym...</p>
                </CardContent>
              </Card>
            </Link>

            {/* Live Service Status Cards */}
            {properties.slice(0, 5).map((property, pIdx) => (
              <Card key={property.id} className={cn("overflow-hidden hover:shadow-lg transition-all duration-300 group", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}
                style={{ transitionDelay: `${400 + pIdx * 100}ms` }}>
                <div className="flex flex-col h-full">
                  {/* Image + Status */}
                  <div className="relative">
                    <ImageCarousel images={property.images} className="w-full h-36" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Badge variant={property.status === "VERIFIED" ? "success" : property.status === "PENDING" ? "secondary" : "destructive"} className="text-[10px]">
                        {property.status}
                      </Badge>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <SeatIndicator capacity={property.capacity} available={property.availableRooms} />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="mb-3">
                      <h4 className="font-semibold text-gray-900 truncate">{property.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0" />{property.city}
                      </p>
                    </div>

                    {/* Live Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-sm font-bold text-gray-900">{property._count?.bookings ?? 0}</p>
                        <p className="text-[10px] text-gray-500">Bookings</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-sm font-bold text-gray-900">{property.totalViews ?? 0}</p>
                        <p className="text-[10px] text-gray-500">Views</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-sm font-bold text-gray-900">{property._count?.wishlistItems ?? 0}</p>
                        <p className="text-[10px] text-gray-500">Wishlisted</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{property.avgRating.toFixed(1)}</span>
                      <span>·</span>
                      <span>{formatPrice(property.price)}/mo</span>
                      <span>·</span>
                      <span className="capitalize">{property.serviceType.toLowerCase()}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-auto space-y-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8 transition-all active:scale-95" onClick={() => setSeatProp(property)}>
                          <Armchair className="h-3 w-3 mr-1" />Seats
                        </Button>
                        <Link href={`/admin/properties/${property.slug}/manage`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs h-8 transition-all active:scale-95"><Eye className="h-3 w-3 mr-1" />Manage</Button>
                        </Link>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/admin/properties/${property.slug}/manage?tab=edit`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full text-xs h-8 transition-all active:scale-95"><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                        </Link>
                        <Button size="sm" variant="outline" className="flex-1 text-xs h-8 transition-all active:scale-95" onClick={() => setAnnounceProp(property)}>
                          <Megaphone className="h-3 w-3 mr-1" />Announce
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ══════ RECENT BOOKINGS ══════ */}
        <section className={cn("mb-10 transition-all duration-600 delay-400", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />Recent Bookings
          </h3>

          {ownerBookings.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <Calendar className="h-12 w-12 text-gray-300 mb-4" />
                <h4 className="text-lg font-semibold text-gray-900">No bookings yet</h4>
                <p className="text-sm text-gray-500 mt-1">When students book your services, they&apos;ll appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {ownerBookings.slice(0, 6).map((booking, bIdx) => {
                const isManageable = ["CONFIRMED", "ACTIVE"].includes(booking.status);
                return (
                  <Card key={booking.id} className={cn("overflow-hidden hover:shadow-md transition-all duration-300", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}
                    style={{ transitionDelay: `${500 + bIdx * 80}ms` }}>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary" />
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
                              <span className="font-medium text-gray-900 truncate ml-2">{booking.property.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Dates</span>
                              <span className="text-gray-700 text-xs">
                                {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                {" → "}
                                {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 shrink-0">
                          <Badge variant={["ACTIVE", "CONFIRMED"].includes(booking.status) ? "success" : booking.status === "COMPLETED" ? "secondary" : "destructive"} className="text-xs">
                            {booking.status}
                          </Badge>
                          {isManageable && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs h-8 text-green-700 border-green-200 hover:bg-green-50 active:scale-95 transition-all"
                                onClick={() => handleBookingAction(booking.id, "COMPLETED")} disabled={updatingBooking === booking.id}>
                                {updatingBooking === booking.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}Complete
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 active:scale-95 transition-all"
                                onClick={() => handleBookingAction(booking.id, "CANCELLED")} disabled={updatingBooking === booking.id}>
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
              {ownerBookings.length > 6 && (
                <p className="text-sm text-gray-500 text-center pt-2">Showing 6 of {ownerBookings.length} bookings</p>
              )}
            </div>
          )}
        </section>

        {/* ══════ BUSINESS OVERVIEW + ACTIVITY ══════ */}
        <section className={cn("mb-10 transition-all duration-600 delay-500", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />Business Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Stats */}
            <Card className="bg-linear-to-br from-blue-50 to-indigo-50 border-blue-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-blue-600" />Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-2xl font-bold text-blue-700"><AnimatedCounter value={stats?.totalProperties || 0} /></p><p className="text-xs text-gray-500">Services</p></div>
                  <div><p className="text-2xl font-bold text-green-700"><AnimatedCounter value={stats?.totalReviews || 0} /></p><p className="text-xs text-gray-500">Reviews</p></div>
                  <div><p className="text-2xl font-bold text-purple-700"><AnimatedCounter value={stats?.activeBookings || 0} /></p><p className="text-xs text-gray-500">Active Bookings</p></div>
                  <div><p className="text-2xl font-bold text-yellow-700">{stats?.avgRating?.toFixed(1) || "0.0"}</p><p className="text-xs text-gray-500">Avg Rating</p></div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <Card className="bg-linear-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-green-600" />Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-green-100">
                    <div><p className="text-sm font-semibold text-gray-900">Total Bookings</p><p className="text-[10px] text-gray-500">Across all services</p></div>
                    <span className="text-lg font-bold text-green-700"><AnimatedCounter value={stats?.totalBookings || 0} /></span>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-green-100">
                    <div><p className="text-sm font-semibold text-gray-900">Completion Rate</p></div>
                    <span className="text-lg font-bold text-blue-700">{stats?.totalBookings ? Math.round(((stats?.completedBookings || 0) / stats.totalBookings) * 100) : 0}%</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-green-100">
                    <div><p className="text-sm font-semibold text-gray-900">Total Reviews</p></div>
                    <span className="text-lg font-bold text-amber-700"><AnimatedCounter value={stats?.totalReviews || 0} /></span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity */}
            <Card className="bg-linear-to-br from-amber-50 to-yellow-50 border-amber-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Ticket className="h-5 w-5 text-amber-600" />Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                    <p className="text-sm font-semibold text-gray-900">Open Complaints</p>
                    <Badge className={`text-[10px] ${(stats?.openComplaints || 0) > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{stats?.openComplaints || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                    <p className="text-sm font-semibold text-gray-900">Pending Bookings</p>
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">{stats?.pendingBookings || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-amber-100">
                    <p className="text-sm font-semibold text-gray-900">Announcements</p>
                    <span className="text-lg font-bold text-amber-700"><AnimatedCounter value={stats?.totalAnnouncements || 0} /></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ══════ SERVICE HEALTH SCORE ══════ */}
        {stats && properties.length > 0 && (
          <section className={cn("mb-10 transition-all duration-600 delay-600", contentReady ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
            <Card className="bg-linear-to-br from-indigo-50 via-white to-purple-50 border-indigo-100">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-indigo-600" />Your Service Health Score
                </CardTitle>
                <CardDescription>How well your services are positioned on AasPass</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const hasPhotos = properties.some((p) => p.images.length >= 3);
                  const hasDescription = properties.every((p) => p.name);
                  const hasReviews = (stats.totalReviews || 0) > 0;
                  const hasGoodRating = (stats.avgRating || 0) >= 3.5;
                  const hasCapacity = properties.some((p) => p.capacity);
                  const checks = [hasPhotos, hasDescription, hasReviews, hasGoodRating, hasCapacity];
                  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
                  const scoreColor = score >= 80 ? "text-green-700" : score >= 50 ? "text-yellow-700" : "text-red-700";
                  const scoreBg = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={cn("text-4xl font-black", scoreColor)}>{score}%</div>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-1000", scoreBg)} style={{ width: `${score}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {[
                          { ok: hasPhotos, label: "3+ quality photos uploaded", tip: "Add more photos to attract students" },
                          { ok: hasDescription, label: "Service details completed", tip: "Fill in all service details" },
                          { ok: hasReviews, label: "Has student reviews", tip: "Encourage students to leave reviews" },
                          { ok: hasGoodRating, label: "Rating 3.5+ stars", tip: "Improve service quality for better ratings" },
                          { ok: hasCapacity, label: "Capacity & seats configured", tip: "Set your total capacity and available seats" },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2 py-1.5">
                            {item.ok ? (
                              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
                            )}
                            <span className={item.ok ? "text-gray-700" : "text-yellow-700"}>
                              {item.ok ? item.label : item.tip}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <RouteGuard allowedRole="OWNER">
      <AdminDashboardInner />
    </RouteGuard>
  );
}
