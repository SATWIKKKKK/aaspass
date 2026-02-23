"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import toast from "react-hot-toast";
import {
  Bookmark, Plus, Calendar, Crown, Coins, Gift, RefreshCw, XCircle,
  MessageSquare, Share2, ChevronRight, ArrowRight, Star, Loader2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatDate, formatPrice } from "@/lib/utils";

interface BookingData {
  id: string; bookingNo: string; status: string; checkIn: string; checkOut: string;
  totalPrice: number; grandTotal: number; createdAt: string;
  property: { name: string; slug: string; serviceType: string; images: { url: string }[] };
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  // Unauthenticated visitors are allowed — no redirect to login
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") { setLoading(false); return; }
    Promise.all([
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ]).then(([bookingsData, profileData]) => {
      setBookings(bookingsData.bookings || []);
      setProfile(profileData);
    }).catch(() => toast.error("Failed to load dashboard data"))
    .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) return <div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const activeBookings = bookings.filter((b) => ["ACTIVE", "CONFIRMED", "PENDING"].includes(b.status));
  const superCoins = profile?.superCoins || 0;

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant="student" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8"><h1 className="text-3xl font-bold text-gray-900">Hello {session?.user?.name ? session.user.name.split(" ")[0] : "Guest"} 👋</h1><p className="text-gray-600 mt-1">Get all your things done at one place</p></div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><Bookmark className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-gray-900">{activeBookings.length}</p><p className="text-xs text-gray-500">Active Bookings</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center"><Coins className="h-5 w-5 text-yellow-600" /></div><div><p className="text-2xl font-bold text-gray-900">{superCoins}</p><p className="text-xs text-gray-500">SuperCoins</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center"><Gift className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold text-gray-900">{bookings.length}</p><p className="text-xs text-gray-500">Total Bookings</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center"><Star className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold text-gray-900">{(session?.user as any)?.isPremium ? "Yes" : "No"}</p><p className="text-xs text-gray-500">Premium</p></div></CardContent></Card>
        </div>

        {/* Bookings */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-gray-900">Your Bookings</h2><Link href="/home"><Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" /> Book More</Button></Link></div>
          <div className="space-y-4">
            {bookings.length === 0 && <Card><CardContent className="p-8 text-center"><Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900">No bookings yet</h3><p className="text-gray-500 mt-1">Browse services and make your first booking</p><Link href="/services"><Button className="mt-4">Browse Services</Button></Link></CardContent></Card>}
            {bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <div className="flex flex-col sm:flex-row">
                  <div className="sm:w-48 h-40 sm:h-auto bg-gray-100 flex-shrink-0">
                    {booking.property.images?.[0]?.url ? <img src={booking.property.images[0].url} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"><Bookmark className="h-8 w-8 text-primary/40" /></div>}
                  </div>
                  <div className="flex-1 p-4 sm:p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/services/${booking.property.slug}`} className="font-semibold text-gray-900 hover:text-primary">{booking.property.name}</Link>
                          <Badge variant={["ACTIVE", "CONFIRMED"].includes(booking.status) ? "success" : booking.status === "EXPIRED" || booking.status === "CANCELLED" ? "destructive" : "secondary"}>{booking.status}</Badge>
                        </div>
                        <Badge variant="outline" className="text-xs">{booking.property.serviceType}</Badge>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{formatPrice(booking.grandTotal)}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Check-in: {formatDate(booking.checkIn)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Check-out: {formatDate(booking.checkOut)}</span>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex items-center gap-2 flex-wrap">
                      {["ACTIVE", "CONFIRMED"].includes(booking.status) && <Link href={`/services/${booking.property.slug}`}><Button size="sm" variant="outline"><RefreshCw className="h-3.5 w-3.5 mr-1" /> Renew</Button></Link>}
                      <Link href="/contact"><Button size="sm" variant="ghost"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Complaint</Button></Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <Link href="/home"><Card className="border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"><CardContent className="p-8 flex flex-col items-center justify-center text-center"><div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3"><Plus className="h-6 w-6 text-primary" /></div><p className="font-medium text-gray-900">Add More Services</p><p className="text-sm text-gray-500 mt-1">Browse and book hostels, PGs, libraries & more</p></CardContent></Card></Link>
          </div>
        </section>

        {/* SuperCoins & Premium */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Special For You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-100"><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Coins className="h-5 w-5 text-yellow-600" />SuperCoins</CardTitle><CardDescription>Earn & redeem on every booking</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-bold text-yellow-700">{superCoins}</p><p className="text-sm text-gray-600 mt-1">= {formatPrice(superCoins)} value</p></CardContent>
            </Card>
            {!(session?.user as any)?.isPremium && (
              <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200"><CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4"><div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center"><Crown className="h-6 w-6 text-amber-600" /></div><div><h3 className="font-semibold text-gray-900">Upgrade to Premium</h3><p className="text-sm text-gray-600">AI Chat, pre-booking, late fee waiver & more</p></div></div>
                <Link href="/premium"><Button className="bg-amber-500 hover:bg-amber-600 text-white">Get Premium</Button></Link>
              </CardContent></Card>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
