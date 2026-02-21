"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, Plus, LayoutDashboard, Users, DollarSign, Star,
  ArrowUpRight, Loader2, BarChart3, AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice, formatDate, SERVICE_TYPES } from "@/lib/utils";

interface PropertyData {
  id: string; name: string; slug: string; serviceType: string; status: string;
  price: number; avgRating: number; totalReviews: number; city: string;
  images: { url: string }[];
  _count?: { bookings: number };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/properties?owner=me").then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
    ]).then(([propData, bookData]) => {
      setProperties(propData.properties || []);
      setBookings(bookData.bookings || []);
    }).catch(() => toast.error("Failed to load data"))
    .finally(() => setLoading(false));
  }, [status]);

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totalRevenue = bookings.reduce((sum: number, b: any) => sum + (b.grandTotal || 0), 0);
  const activeBookings = bookings.filter((b: any) => ["ACTIVE", "CONFIRMED"].includes(b.status));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold text-gray-900">Owner Dashboard</h1><p className="text-gray-600 mt-1">Manage your properties and bookings</p></div>
          <Link href="/admin/properties/new"><Button><Plus className="h-4 w-4 mr-2" /> Add Property</Button></Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center"><Building2 className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-gray-900">{properties.length}</p><p className="text-xs text-gray-500">Properties</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center"><DollarSign className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue)}</p><p className="text-xs text-gray-500">Revenue</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center"><Users className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold text-gray-900">{activeBookings.length}</p><p className="text-xs text-gray-500">Active Bookings</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-yellow-50 flex items-center justify-center"><Star className="h-5 w-5 text-yellow-600" /></div><div><p className="text-2xl font-bold text-gray-900">{properties.length > 0 ? (properties.reduce((s, p) => s + p.avgRating, 0) / properties.length).toFixed(1) : "0"}</p><p className="text-xs text-gray-500">Avg Rating</p></div></CardContent></Card>
        </div>

        {/* Properties */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Properties</h2>
          {properties.length === 0 ? (
            <Card><CardContent className="p-12 text-center"><Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900">No properties yet</h3><p className="text-gray-500 mt-1">List your first property to start earning</p><Link href="/admin/properties/new"><Button className="mt-4">Add Property</Button></Link></CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((property) => (
                <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gray-100">
                    {property.images?.[0]?.url ? <img src={property.images[0].url} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"><Building2 className="h-10 w-10 text-primary/30" /></div>}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div><h3 className="font-semibold text-gray-900">{property.name}</h3><p className="text-xs text-gray-500">{property.city}</p></div>
                      <Badge variant={property.status === "ACTIVE" ? "success" : "secondary"}>{property.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{property.avgRating.toFixed(1)}</span>
                      <span>{formatPrice(property.price)}/mo</span>
                    </div>
                    <Link href={`/admin/properties/${property.slug}/manage`}><Button variant="outline" size="sm" className="w-full">Manage <ArrowUpRight className="h-3.5 w-3.5 ml-1" /></Button></Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Recent Bookings */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Bookings</h2>
          {bookings.length === 0 ? <Card><CardContent className="p-8 text-center text-gray-500">No bookings yet.</CardContent></Card> :
          <div className="space-y-3">
            {bookings.slice(0, 10).map((booking: any) => (
              <Card key={booking.id}><CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{booking.property?.name || "Property"}</p>
                  <p className="text-sm text-gray-500">{booking.student?.name || "Student"} &bull; {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatPrice(booking.grandTotal || 0)}</p>
                  <Badge variant={["ACTIVE", "CONFIRMED"].includes(booking.status) ? "success" : "secondary"} className="text-xs">{booking.status}</Badge>
                </div>
              </CardContent></Card>
            ))}
          </div>}
        </section>
      </div>
      <Footer />
    </div>
  );
}
