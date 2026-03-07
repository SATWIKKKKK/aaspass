"use client";

import { useState, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Plus, Calendar, Crown, Coins, RefreshCw, XCircle,
  MessageSquare, Share2, ChevronDown, Loader2, Settings, LogOut,
  Bookmark, LayoutDashboard, Ticket, Award, Search, User, Building2, Clock, MapPin, Star,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PremiumModal } from "@/components/premium-modal";
import { ExpiryWarningBanner } from "@/components/expiry-warning-banner";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { RouteGuard } from "@/components/route-guard";
import { cn, formatDate, formatPrice } from "@/lib/utils";

interface BookingData {
  id: string;
  bookingNo: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  gstAmount: number;
  grandTotal: number;
  totalDays: number;
  razorpayPaymentId: string | null;
  paymentStatus: string;
  createdAt: string;
  property: {
    name: string;
    slug: string;
    serviceType: string;
    images: { url: string }[];
  };
}

/* -- Booking Card -- */
function BookingCard({
  booking,
  onCancel,
  onShare,
  cancellingId,
}: {
  booking: BookingData;
  onCancel: (id: string) => void;
  onShare: (b: BookingData) => void;
  cancellingId: string | null;
}) {
  const isActive = ["ACTIVE", "CONFIRMED", "PENDING"].includes(booking.status);
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Share icon top-right */}
      <button
        onClick={() => onShare(booking)}
        className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
        title="Share"
      >
        <Share2 className="h-4 w-4 text-gray-600" />
      </button>

      <CardContent className="p-5">
        {/* Service name + badges */}
        <div className="pr-8 mb-3">
          <Link
            href={`/services/${booking.property.slug}`}
            className="font-semibold text-gray-900 hover:text-primary transition-colors text-base"
          >
            {booking.property.name}
          </Link>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{booking.property.serviceType}</Badge>
            <Badge
              variant={
                ["ACTIVE", "CONFIRMED"].includes(booking.status)
                  ? "success"
                  : booking.status === "EXPIRED" || booking.status === "CANCELLED"
                  ? "destructive"
                  : "secondary"
              }
              className="text-[10px]"
            >
              {booking.status}
            </Badge>
            {booking.paymentStatus === "paid" && (
              <Badge className="bg-green-100 text-green-700 text-[10px]">Paid</Badge>
            )}
          </div>
        </div>

        {/* Booking Reference + Amount */}
        {(booking.bookingNo || booking.grandTotal > 0) && (
          <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3 space-y-1 text-sm">
            {booking.bookingNo && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Booking ID</span>
                <span className="font-mono text-xs text-gray-700">{booking.bookingNo}</span>
              </div>
            )}
            {booking.grandTotal > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Amount Paid</span>
                <span className="font-semibold text-green-700">{formatPrice(booking.grandTotal)}</span>
              </div>
            )}
            {booking.totalDays > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-700 text-xs">{booking.totalDays} day{booking.totalDays !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        )}

        {/* Dates */}
        <div className="space-y-1.5 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span><span className="font-medium text-gray-700">Booked on:</span> {formatDate(booking.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span><span className="font-medium text-gray-700">Expires on:</span> {formatDate(booking.checkOut)}</span>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Action buttons */}
        {isActive && (
          <div className="flex items-center gap-2">
            <Link href={`/services/${booking.property.slug}`} className="flex-1">
              <Button size="sm" variant="outline" className="w-full text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Renew
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => onCancel(booking.id)}
              disabled={cancellingId === booking.id}
            >
              {cancellingId === booking.id ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              Cancel
            </Button>
          </div>
        )}

        {/* Complaint box */}
        <Link href="/contact" className={cn("block", isActive ? "mt-2" : "")}>
          <Button size="sm" variant="ghost" className="w-full text-xs text-gray-500 hover:text-gray-700">
            <MessageSquare className="h-3 w-3 mr-1" /> Complaint Box
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════ MAIN DASHBOARD ═══════════════════ */
function StudentDashboardInner() {
  const { data: session, status } = useSession();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  const isPremium = (session?.user as any)?.isPremium;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { setLoading(false); return; }
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([bookingsData, profileData]) => {
        setBookings(bookingsData.bookings || []);
        setProfile(profileData.user || profileData);
      })
      .catch(() => toast.error("Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, [status]);

  // GSAP entrance animations after data loads
  useEffect(() => {
    if (loading) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo("[data-gsap='dash-hero']", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 })
      .fromTo("[data-gsap='dash-greeting']", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.2")
      .fromTo("[data-gsap='dash-section']", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.12 }, "-=0.1")
      .fromTo("[data-gsap='dash-card']", { opacity: 0, y: 16, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, stagger: 0.06 }, "-=0.2");
  }, [loading]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [profileOpen]);

  // Load recently viewed from localStorage
  useEffect(() => {
    try {
      const slugs: string[] = JSON.parse(localStorage.getItem("aaspass_recently_viewed") || "[]").slice(0, 6);
      if (slugs.length === 0) return;
      Promise.all(slugs.map((slug) => fetch(`/api/properties/${slug}`).then((r) => r.ok ? r.json() : null).catch(() => null)))
        .then((results) => setRecentlyViewed(results.filter(Boolean).map((r: any) => r.property).filter(Boolean)));
    } catch {}
  }, []);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b)));
        toast.success("Booking cancelled");
      } else { toast.error("Failed to cancel booking"); }
    } catch { toast.error("Something went wrong"); }
    finally { setCancellingId(null); }
  };

  const handleShare = async (booking: BookingData) => {
    const text = `Check out my ${booking.property.serviceType} booking at ${booking.property.name} on AasPass!`;
    if (navigator.share) {
      try { await navigator.share({ title: "My AasPass Booking", text, url: `${window.location.origin}/services/${booking.property.slug}` }); }
      catch { /* user cancelled share */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Booking details copied to clipboard!");
    }
  };

  if (status === "loading" || loading)
    return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const superCoins = profile?.superCoins || 0;
  const userName = session?.user?.name ? session.user.name.split(" ")[0] : "Guest";

  return (
    <div className="min-h-screen bg-white">
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      {/* --- MINIMAL NAVBAR: logo + profile only --- */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/home" className="flex items-center gap-2">
              <span className="sr-only">AasPass</span>
            </Link>

            {session ? (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 h-10 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                >
                  <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
                  </div>
                  {isPremium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-60">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{session.user?.name}</p>
                      <p className="text-xs text-gray-500">{session.user?.email}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-200">Student</Badge>
                        {isPremium && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-3 w-3 mr-0.5" />Premium</Badge>}
                      </div>
                    </div>
                    <Link href="/settings/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileOpen(false)}>
                      <User className="h-4 w-4 text-gray-400" /> Personal Details
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 text-gray-400" /> My Dashboard
                    </Link>
                    <Link href="/services" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileOpen(false)}>
                      <Search className="h-4 w-4 text-gray-400" /> Browse Services
                    </Link>
                    {!isPremium && (
                      <button onClick={() => { setPremiumOpen(true); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors">
                        <Crown className="h-4 w-4" /> Upgrade to Premium
                      </button>
                    )}
                    <Link href="/settings/edit" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileOpen(false)}>
                      <Settings className="h-4 w-4 text-gray-400" /> Settings
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button onClick={() => signOut({ callbackUrl: "/home" })} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="outline" size="sm">Sign In</Button></Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- AASPASS HERO TEXT --- */}
      <div data-gsap="dash-hero" className="text-center pt-8 pb-4" style={{ opacity: 0 }}>
        <Link href="/home">
          <h1 className="font-black tracking-tight text-primary text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none select-none hover:opacity-80 transition-opacity">
            Aas<span className="text-premium">Pass</span>
          </h1>
        </Link>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Expiry warning for premium users nearing end */}
        {isPremium && <div className="mb-4"><ExpiryWarningBanner /></div>}

        {/* Announcement banner */}
        <div className="mb-4"><AnnouncementBanner /></div>

        {/* Greeting */}
        <div data-gsap="dash-greeting" className="mb-8" style={{ opacity: 0 }}>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Hello {userName} </h2>
          <p className="text-gray-600 mt-1">Get all your things done at one place.</p>
        </div>

        {/* --- YOUR BOOKINGS --- */}
        <section data-gsap="dash-section" className="mb-12" style={{ opacity: 0 }}>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Your Bookings</h3>

          {bookings.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                  <Bookmark className="h-12 w-12 text-gray-500 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900">No bookings yet</h4>
                  <p className="text-sm text-gray-500 mt-1">Browse services and make your first booking</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-dashed border-gray-200 hidden sm:block">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                  <Calendar className="h-12 w-12 text-gray-500 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900">More bookings</h4>
                  <p className="text-sm text-gray-500 mt-1">will appear here</p>
                </CardContent>
              </Card>
              <Link href="/home">
                <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer h-full">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3"><Plus className="h-7 w-7 text-primary" /></div>
                    <p className="font-semibold text-gray-900">Add More</p>
                    <p className="text-sm text-gray-500 mt-1">Redirects to homepage</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookings.slice(0, 2).map((booking) => (
                <BookingCard key={booking.id} booking={booking} onCancel={handleCancel} onShare={handleShare} cancellingId={cancellingId} />
              ))}

              {/* Add More card */}
              <Link href="/home">
                <Card className="border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all cursor-pointer h-full">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full min-h-55">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3"><Plus className="h-7 w-7 text-primary" /></div>
                    <p className="font-semibold text-gray-900">Add More</p>
                    <p className="text-sm text-gray-500 mt-1">Redirects to homepage</p>
                  </CardContent>
                </Card>
              </Link>

              {/* Overflow bookings */}
              {bookings.length > 2 && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-primary hover:underline list-none flex items-center gap-1 mb-4">
                      <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
                      View {bookings.length - 2} more booking{bookings.length - 2 > 1 ? "s" : ""}
                    </summary>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {bookings.slice(2).map((booking) => (
                        <BookingCard key={booking.id} booking={booking} onCancel={handleCancel} onShare={handleShare} cancellingId={cancellingId} />
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}
        </section>

        {/* --- SPECIAL FOR YOU --- */}
        <section data-gsap="dash-section" className="mb-12" style={{ opacity: 0 }}>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Special For You</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* SuperCoins */}
            <Card data-gsap="dash-card" className="bg-linear-to-br from-yellow-50 to-amber-50 border-yellow-100 hover:shadow-md transition-shadow" style={{ opacity: 0 }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Coins className="h-5 w-5 text-yellow-600" />SuperCoins</CardTitle>
                <CardDescription>Earn & redeem on every booking</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-700">{superCoins}</p>
                <p className="text-sm text-gray-600 mt-1">= {formatPrice(superCoins)} value</p>
              </CardContent>
            </Card>

            {/* Rewards */}
            <Card data-gsap="dash-card" className="bg-linear-to-br from-green-50 to-emerald-50 border-green-100 hover:shadow-md transition-shadow" style={{ opacity: 0 }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Award className="h-5 w-5 text-green-600" />Rewards</CardTitle>
                <CardDescription>Unlock badges and perks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {[
                      { bg: "bg-blue-100", icon: "\u{1F3E0}" },
                      { bg: "bg-purple-100", icon: "\u2B50" },
                      { bg: "bg-pink-100", icon: "\u{1F389}" },
                    ].map((badge, i) => (
                      <div key={i} className={cn("h-10 w-10 rounded-full flex items-center justify-center border-2 border-white text-lg", badge.bg)}>
                        {badge.icon}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {bookings.length >= 5 ? "Gold Member" : bookings.length >= 2 ? "Silver Member" : "New Member"}
                    </p>
                    <p className="text-xs text-gray-500">{bookings.length} booking{bookings.length !== 1 ? "s" : ""} completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coupons */}
            <Card data-gsap="dash-card" className="bg-linear-to-br from-purple-50 to-indigo-50 border-purple-100 hover:shadow-md transition-shadow" style={{ opacity: 0 }}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg"><Ticket className="h-5 w-5 text-purple-600" />Coupons</CardTitle>
                <CardDescription>Available discount codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-purple-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">AASPASS20</p>
                      <p className="text-[10px] text-gray-500">20% off first booking</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 text-[10px]">Active</Badge>
                  </div>
                  {(session?.user as any)?.isPremium && (
                    <div className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2 border border-purple-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">PREMIUM50</p>
                        <p className="text-[10px] text-gray-500">{"\u20B9"}50 off for members</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* --- RECENTLY VIEWED --- */}
        {recentlyViewed.length > 0 && (
          <section className="mb-12">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Clock className="h-5 w-5 text-gray-400" /> Recently Viewed</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentlyViewed.map((p: any) => (
                <Link key={p.id} href={`/services/${p.slug}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer">
                    <div className="h-36 bg-gray-100 overflow-hidden">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Building2 className="h-8 w-8 text-gray-300" /></div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {p.city}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary">{formatPrice(p.price)}/mo</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{p.avgRating?.toFixed(1)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <RouteGuard allowedRole="STUDENT">
      <StudentDashboardInner />
    </RouteGuard>
  );
}
