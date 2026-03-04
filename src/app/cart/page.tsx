"use client";

import { useState, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ShoppingCart, Trash2, Building2, ChevronLeft, MapPin, Loader2, CreditCard, Calendar } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice, calculateDynamicPrice, formatDate } from "@/lib/utils";

interface CartItem {
  id: string; checkIn: string; checkOut: string;
  property: { id: string; name: string; slug: string; city: string; serviceType: string; price: number; gstRate: number; images: { url: string }[] };
}

function CartPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

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

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-checkout-js")) { resolve(true); return; }
      const script = document.createElement("script");
      script.id = "razorpay-checkout-js";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayAll = async () => {
    if (items.length === 0) return;
    setPaying(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Failed to load payment gateway"); setPaying(false); return; }

      let successCount = 0;
      for (const item of items) {
        const success = await processPayment(item);
        if (success) successCount++;
        else break;
      }

      if (successCount === items.length) {
        await fetch("/api/cart?all=true", { method: "DELETE" });
        toast.success(`All ${successCount} bookings confirmed! 🎉`);
        router.push("/dashboard");
      } else if (successCount > 0) {
        toast.success(`${successCount} of ${items.length} bookings confirmed.`);
        const res = await fetch("/api/cart");
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch { toast.error("Payment failed"); }
    finally { setPaying(false); }
  };

  const processPayment = (item: CartItem): Promise<boolean> => {
    return new Promise(async (resolve) => {
      try {
        const orderRes = await fetch("/api/payment/create-booking-order", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: item.property.id, checkIn: item.checkIn, checkOut: item.checkOut }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) { toast.error(orderData.error || `Failed to create order for ${item.property.name}`); resolve(false); return; }

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "AasPass",
          description: `Booking for ${orderData.propertyName}`,
          order_id: orderData.orderId,
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch("/api/payment/verify-booking", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  propertyId: item.property.id, checkIn: item.checkIn, checkOut: item.checkOut,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                toast.success(`Booking confirmed for ${item.property.name}!`);
                await fetch(`/api/cart?id=${item.id}`, { method: "DELETE" });
                setItems((prev) => prev.filter((i) => i.id !== item.id));
                resolve(true);
              } else {
                toast.error(verifyData.error || "Payment verification failed");
                resolve(false);
              }
            } catch { toast.error("Payment verification failed"); resolve(false); }
          },
          prefill: { name: session?.user?.name || "", email: session?.user?.email || "" },
          theme: { color: "#6366f1" },
          modal: { ondismiss: () => { resolve(false); } },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", (response: any) => {
          toast.error(response.error?.description || "Payment failed");
          resolve(false);
        });
        rzp.open();
      } catch { toast.error("Payment failed"); resolve(false); }
    });
  };

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo("[data-gsap='cart-title']", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 })
      .fromTo("[data-gsap='cart-item']", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.07 }, "-=0.2")
      .fromTo("[data-gsap='cart-summary']", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4 }, "-=0.3");
  });

  const itemPricing = items.map((item) => {
    const ciStr = item.checkIn ? new Date(item.checkIn).toISOString().split("T")[0] : "";
    const coStr = item.checkOut ? new Date(item.checkOut).toISOString().split("T")[0] : "";
    const pricing = calculateDynamicPrice(item.property.price, item.property.gstRate, ciStr, coStr);
    return { ...item, pricing };
  });

  const totals = itemPricing.reduce((acc, item) => ({
    base: acc.base + item.pricing.base,
    gst: acc.gst + item.pricing.gst,
    total: acc.total + item.pricing.total,
  }), { base: 0, gst: 0, total: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="student" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4"><ChevronLeft className="h-4 w-4" /> Continue Browsing</Link>
        <h1 data-gsap="cart-title" className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3" style={{ opacity: 0 }}><ShoppingCart className="h-8 w-8 text-primary" /> Your Cart ({items.length})</h1>

        {items.length === 0 ? (
          <Card><CardContent className="p-12 text-center"><ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900 mb-2">Your cart is empty</h3><p className="text-gray-500 mb-4">Browse services to add to your cart</p><Link href="/services"><Button>Browse Services</Button></Link></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {itemPricing.map((item) => (
                <Card key={item.id} data-gsap="cart-item" style={{ opacity: 0 }}><CardContent className="p-4"><div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg shrink-0 overflow-hidden">
                    {item.property.images?.[0]?.url ? <img src={item.property.images[0].url} alt="" className="w-full h-full object-cover" /> :
                    <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center"><Building2 className="h-8 w-8 text-primary/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/services/${item.property.slug}`} className="font-semibold text-gray-900 hover:text-primary">{item.property.name}</Link>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{item.property.serviceType}</Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="h-3 w-3" />{item.property.city}</span>
                        </div>
                      </div>
                      <button onClick={() => removeItem(item.id)} disabled={removing === item.id} className="text-gray-400 hover:text-red-500">
                        {removing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {item.checkIn ? formatDate(item.checkIn) : "N/A"} → {item.checkOut ? formatDate(item.checkOut) : "N/A"}
                      <span className="ml-1 font-medium text-gray-700">({item.pricing.days} day{item.pricing.days !== 1 ? "s" : ""})</span>
                    </div>
                    <div className="mt-1.5">
                      <p className="text-sm text-gray-600">{formatPrice(item.pricing.perDay)}/day × {item.pricing.days} = <span className="font-bold text-primary">{formatPrice(item.pricing.base)}</span></p>
                      <p className="text-xs text-gray-400">+ {item.property.gstRate}% GST = {formatPrice(item.pricing.total)}</p>
                    </div>
                  </div>
                </div></CardContent></Card>
              ))}
            </div>
            <div data-gsap="cart-summary" style={{ opacity: 0 }}><Card className="sticky top-20"><CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-gray-900">Order Summary</h3><Separator />
              <div className="space-y-2 text-sm">
                {itemPricing.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <span className="text-gray-500 truncate max-w-35">{item.property.name}</span>
                    <span>{formatPrice(item.pricing.base)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatPrice(totals.base)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatPrice(totals.gst)}</span></div>
                <Separator /><div className="flex justify-between font-semibold text-base"><span>Total</span><span className="text-primary">{formatPrice(totals.total)}</span></div>
              </div>
              <Button className="w-full" size="lg" onClick={handlePayAll} disabled={paying}>
                {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><CreditCard className="h-4 w-4 mr-2" />Pay {formatPrice(totals.total)}</>}
              </Button>
              <p className="text-[10px] text-gray-400 text-center">Secured by Razorpay</p>
            </CardContent></Card></div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default function CartPage() {
  return (
    <RouteGuard allowedRole="STUDENT">
      <CartPageInner />
    </RouteGuard>
  );
}
