"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ShoppingCart, Trash2, Building2, ChevronLeft, MapPin, Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice, calculateGST } from "@/lib/utils";

interface CartItem {
  id: string; checkIn: string; checkOut: string;
  property: { id: string; name: string; slug: string; city: string; serviceType: string; price: number; gstRate: number; images: { url: string }[] };
}

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/cart").then((r) => r.json()).then((data) => setItems(data.items || []))
      .catch(() => toast.error("Failed to load cart")).finally(() => setLoading(false));
  }, [status]);

  const removeItem = async (id: string) => {
    setRemoving(id);
    try {
      const res = await fetch(`/api/cart?id=${id}`, { method: "DELETE" });
      if (res.ok) { setItems((prev) => prev.filter((i) => i.id !== id)); toast.success("Removed from cart"); }
      else toast.error("Failed to remove item");
    } catch { toast.error("Failed to remove"); }
    finally { setRemoving(null); }
  };

  const handleBookAll = async () => {
    setBooking(true);
    try {
      for (const item of items) {
        const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: item.property.id, checkIn: item.checkIn, checkOut: item.checkOut }) });
        if (!res.ok) { const data = await res.json(); toast.error(`Failed to book ${item.property.name}: ${data.error}`); }
      }
      // Clear cart after booking
      await fetch("/api/cart?all=true", { method: "DELETE" });
      toast.success("All bookings confirmed! 🎉");
      router.push("/dashboard");
    } catch { toast.error("Booking failed"); }
    finally { setBooking(false); }
  };

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const totals = items.reduce((acc, item) => {
    const { base, gst, total } = calculateGST(item.property.price, item.property.gstRate);
    return { base: acc.base + base, gst: acc.gst + gst, total: acc.total + total };
  }, { base: 0, gst: 0, total: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="student" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4"><ChevronLeft className="h-4 w-4" /> Continue Browsing</Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3"><ShoppingCart className="h-8 w-8 text-primary" /> Your Cart ({items.length})</h1>

        {items.length === 0 ? (
          <Card><CardContent className="p-12 text-center"><ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3><p className="text-gray-500 mb-4">Browse services to add properties</p><Link href="/services"><Button>Browse Services</Button></Link></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.id}><CardContent className="p-4"><div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {item.property.images?.[0]?.url ? <img src={item.property.images[0].url} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"><Building2 className="h-8 w-8 text-primary/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div><Link href={`/services/${item.property.slug}`} className="font-semibold text-gray-900 hover:text-primary">{item.property.name}</Link>
                        <div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-xs">{item.property.serviceType}</Badge><span className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{item.property.city}</span></div>
                      </div>
                      <button onClick={() => removeItem(item.id)} disabled={removing === item.id} className="text-gray-400 hover:text-red-500">
                        {removing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-lg font-bold text-primary mt-2">{formatPrice(item.property.price)}<span className="text-sm font-normal text-gray-500">/month</span></p>
                  </div>
                </div></CardContent></Card>
              ))}
            </div>
            <div><Card className="sticky top-20"><CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-gray-900">Order Summary</h3><Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(totals.base)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatPrice(totals.gst)}</span></div>
                <Separator /><div className="flex justify-between font-semibold text-base"><span>Total</span><span className="text-primary">{formatPrice(totals.total)}</span></div>
              </div>
              <Button className="w-full" size="lg" onClick={handleBookAll} disabled={booking}>
                {booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : "Proceed to Book"}
              </Button>
            </CardContent></Card></div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
