"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  MapPin, Star, Wifi, Wind, Utensils, Shirt, ShieldCheck, Users, Phone, MessageSquare,
  Share2, Heart, ChevronLeft, ShoppingCart, Building2, Navigation,
  CheckCircle2, AlertCircle, Loader2, Copy, BadgeCheck, ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GoogleMap } from "@/components/google-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatPrice, calculateGST, calculateDynamicPrice, getDailyRate, formatDate, serviceTypeLabel } from "@/lib/utils";
import { useSearch } from "@/context/search-context";

interface PricingPlan {
  id: string; label: string; durationDays: number; price: number; isActive: boolean;
}

interface PropertyData {
  id: string; name: string; slug: string; serviceType: string; description: string;
  price: number; gstRate: number; address: string; city: string; state: string; pincode: string;
  latitude: number | null; longitude: number | null; nearbyLandmark: string | null;
  distanceMarket: string | null; distanceInstitute: string | null;
  isAC: boolean; hasWifi: boolean; forGender: string | null; occupancy: number | null;
  foodIncluded: boolean; laundryIncluded: boolean; foodRating: number | null;
  hasMedical: boolean; nearbyMess: string | null; nearbyLaundry: string | null;
  cancellationPolicy: string | null; rules: string | null;
  avgRating: number; totalReviews: number;
  images: { url: string; isWideShot: boolean }[];
  owner: { name: string; phone: string | null };
  reviews: { id: string; rating: number; comment: string | null; createdAt: string; user: { name: string } }[];
  pricingPlans?: PricingPlan[];
}

interface BookingConfirmation {
  bookingReference: string; propertyName: string; ownerName: string; ownerPhone: string | null;
  checkIn: string; checkOut: string; totalDays: number; basePrice: number; gstAmount: number;
  grandTotal: number; planLabel: string | null; paymentId: string;
}

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const { data: session } = useSession();
  const { search } = useSearch();
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState(sp.get("from") || search.checkIn || "");
  const [checkOut, setCheckOut] = useState(sp.get("to") || search.checkOut || "");
  const [hasBooking, setHasBooking] = useState(false);
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [booking, setBooking] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showPlanRestriction, setShowPlanRestriction] = useState(false);
  const [bookingConfirmation, setBookingConfirmation] = useState<BookingConfirmation | null>(null);

  // Load wishlist from localStorage
  useEffect(() => {
    try {
      const wishlist = JSON.parse(localStorage.getItem("aaspass_wishlist") || "[]");
      if (wishlist.includes(params.slug)) setSaved(true);
    } catch {}
  }, [params.slug]);

  const toggleSave = () => {
    try {
      const wishlist: string[] = JSON.parse(localStorage.getItem("aaspass_wishlist") || "[]");
      const slug = params.slug as string;
      if (wishlist.includes(slug)) {
        localStorage.setItem("aaspass_wishlist", JSON.stringify(wishlist.filter((s) => s !== slug)));
        setSaved(false);
        toast.success("Removed from wishlist");
      } else {
        wishlist.unshift(slug);
        localStorage.setItem("aaspass_wishlist", JSON.stringify(wishlist.slice(0, 50)));
        setSaved(true);
        toast.success("Saved to wishlist");
      }
    } catch {}
  };

  const handleShare = async (method: "copy" | "whatsapp" | "native") => {
    const url = window.location.href;
    const text = `Check out ${property?.name} on AasPass - ${url}`;
    if (method === "copy") { await navigator.clipboard.writeText(url); toast.success("Link copied!"); }
    else if (method === "whatsapp") window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    else if (navigator.share) await navigator.share({ title: property?.name, text, url });
    setShowShareMenu(false);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/properties/${params.slug}`);
        if (res.ok) {
          const data = await res.json();
          setProperty(data.property);
          // Track recently viewed
          try {
            const rv: string[] = JSON.parse(localStorage.getItem("aaspass_recently_viewed") || "[]");
            const slug = params.slug as string;
            const updated = [slug, ...rv.filter((s) => s !== slug)].slice(0, 20);
            localStorage.setItem("aaspass_recently_viewed", JSON.stringify(updated));
          } catch {}
          // Check if current user has a confirmed booking for this property
          if (session) {
            try {
              const bRes = await fetch("/api/bookings");
              const bData = await bRes.json();
              const booked = (bData.bookings || []).some((b: any) => b.propertyId === data.property.id && ["CONFIRMED", "COMPLETED"].includes(b.status));
              setHasBooking(booked);
            } catch {}
          }
        } else toast.error("Property not found");
      } catch { toast.error("Failed to load property"); }
      finally { setLoading(false); }
    }
    if (params.slug) load();
  }, [params.slug, session]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center"><p>Property not found</p></div>;

  const pricing = calculateDynamicPrice(property.price, property.gstRate, checkIn, checkOut);
  const perDay = getDailyRate(property.price);

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

  const handleBookNow = async () => {
    if (!session) { router.push("/login"); return; }
    if (!property) return;

    const hasPlans = property.pricingPlans && property.pricingPlans.length > 0;

    // If plans exist, a plan must be selected
    if (hasPlans && !selectedPlanId) {
      toast.error("Please select a booking plan");
      return;
    }

    // If plans exist, auto-set dates from plan
    let bookCheckIn = checkIn;
    let bookCheckOut = checkOut;

    if (hasPlans && selectedPlanId) {
      const plan = property.pricingPlans!.find((p) => p.id === selectedPlanId);
      if (!plan) { toast.error("Invalid plan"); return; }

      if (!bookCheckIn) {
        bookCheckIn = new Date().toISOString().split("T")[0];
      }
      // Auto-calculate checkout from plan duration
      const ciDate = new Date(bookCheckIn);
      const coDate = new Date(ciDate.getTime() + plan.durationDays * 86400000);
      bookCheckOut = coDate.toISOString().split("T")[0];
      setCheckOut(bookCheckOut);

      // Validate the date range matches the plan
      const daysDiff = Math.ceil((coDate.getTime() - ciDate.getTime()) / 86400000);
      if (daysDiff !== plan.durationDays) {
        setShowPlanRestriction(true);
        return;
      }
    } else if (!hasPlans) {
      if (!bookCheckIn || !bookCheckOut) {
        toast.error("Please select check-in and check-out dates");
        return;
      }
    }

    setBooking(true);
    try {
      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) { toast.error("Failed to load payment gateway"); setBooking(false); return; }

      // Create Razorpay order
      const orderRes = await fetch("/api/payment/create-booking-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          checkIn: bookCheckIn,
          checkOut: bookCheckOut,
          ...(selectedPlanId ? { planId: selectedPlanId } : {}),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        if (orderData.plans) {
          // Server says plans are required
          setShowPlanRestriction(true);
        }
        toast.error(orderData.error || "Failed to create payment order");
        setBooking(false);
        return;
      }

      const planLabel = orderData.planLabel || null;

      // Open Razorpay checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AasPass",
        description: `Booking for ${orderData.propertyName}${planLabel ? ` (${planLabel})` : ""}`,
        order_id: orderData.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch("/api/payment/verify-booking", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                propertyId: property.id,
                checkIn: bookCheckIn,
                checkOut: bookCheckOut,
                planLabel,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              // Show booking confirmation popup
              setBookingConfirmation({
                bookingReference: verifyData.bookingReference,
                propertyName: verifyData.propertyName || property.name,
                ownerName: verifyData.ownerName || property.owner.name,
                ownerPhone: verifyData.ownerPhone || property.owner.phone,
                checkIn: bookCheckIn,
                checkOut: bookCheckOut,
                totalDays: verifyData.totalDays || orderData.days,
                basePrice: verifyData.basePrice || orderData.basePrice,
                gstAmount: verifyData.gstAmount || orderData.gst,
                grandTotal: verifyData.grandTotal || orderData.totalAmount,
                planLabel: verifyData.planLabel || planLabel,
                paymentId: verifyData.paymentId || response.razorpay_payment_id,
              });
              toast.success("Booking confirmed! Payment successful.");
            } else {
              toast.error(verifyData.error || "Payment verification failed");
            }
          } catch { toast.error("Payment verification failed"); }
          finally { setBooking(false); }
        },
        prefill: {
          name: session.user?.name || "",
          email: session.user?.email || "",
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => { setBooking(false); },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        toast.error(response.error?.description || "Payment failed");
        setBooking(false);
      });
      rzp.open();
    } catch { toast.error("Booking failed"); setBooking(false); }
  };

  const handleAddToCart = async () => {
    if (!session) { router.push("/login"); return; }
    setAddingToCart(true);
    try {
      const ci = checkIn || new Date().toISOString();
      const co = checkOut || new Date(Date.now() + 30 * 86400000).toISOString();
      const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, checkIn: ci, checkOut: co }) });
      const data = await res.json();
      if (res.ok) toast.success("Added to cart!");
      else toast.error(data.error || "Failed to add to cart");
    } catch { toast.error("Failed to add to cart"); }
    finally { setAddingToCart(false); }
  };

  const handleSubmitReview = async () => {
    if (!session) { router.push("/login"); return; }
    if (newRating === 0) { toast.error("Please select a rating"); return; }
    setSubmittingReview(true);
    try {
      const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, rating: newRating, comment: newReview }) });
      const data = await res.json();
      if (res.ok) {
        toast.success("Review submitted!");
        setNewReview(""); setNewRating(0);
        setProperty((prev) => prev ? {
          ...prev,
          reviews: [{ id: data.id, rating: newRating, comment: newReview, createdAt: new Date().toISOString(), user: { name: session.user?.name || "You" } }, ...prev.reviews],
          avgRating: data.avgRating || prev.avgRating, totalReviews: prev.totalReviews + 1
        } : prev);
      } else toast.error(data.error || "Failed to submit review");
    } catch { toast.error("Failed to submit review"); }
    finally { setSubmittingReview(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant={session ? ((session.user as any)?.role === "OWNER" ? "minimal-admin" : "minimal-student") : "public"} showNavLinks={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
          <ChevronLeft className="h-4 w-4" /> Back to Services
        </Link>
      </div>

      {/* Image Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-2xl overflow-hidden">
          <div className="md:col-span-2 md:row-span-2 h-64 md:h-[400px] bg-gray-100">
            {property.images?.[0]?.url ? (
              <img src={property.images[0].url} alt={property.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <Building2 className="h-16 w-16 text-primary/30" />
              </div>
            )}
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={cn("h-48 bg-gray-100", i > 2 && "hidden md:block")}>
              {property.images?.[i]?.url ? (
                <img src={property.images[i].url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
                  <Badge variant="outline">
                    {serviceTypeLabel(property.serviceType)}
                  </Badge>
                  {property.forGender && (
                    <Badge variant={property.forGender === "MALE" ? "default" : "secondary"}>
                      <Users className="h-3 w-3 mr-1" /> {property.forGender === "MALE" ? "Boys" : "Girls"} Only
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="relative">
                    <button onClick={() => setShowShareMenu(!showShareMenu)} className="p-2 rounded-full hover:bg-gray-100 transition" title="Share">
                      <Share2 className="h-5 w-5 text-gray-600" />
                    </button>
                    {showShareMenu && (
                      <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-xl py-2 w-48 z-50">
                        <button onClick={() => handleShare("copy")} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><Copy className="h-4 w-4 text-gray-400" /> Copy Link</button>
                        <button onClick={() => handleShare("whatsapp")} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><MessageSquare className="h-4 w-4 text-green-500" /> WhatsApp</button>
                        <button onClick={() => handleShare("native")} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"><ExternalLink className="h-4 w-4 text-gray-400" /> More...</button>
                      </div>
                    )}
                  </div>
                  <button onClick={toggleSave} className="p-2 rounded-full hover:bg-gray-100 transition" title={saved ? "Remove from wishlist" : "Save"}>
                    <Heart className={cn("h-5 w-5 transition", saved ? "fill-red-500 text-red-500" : "text-gray-600")} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {property.address}, {property.city}</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-gray-900">{property.avgRating.toFixed(1)}</span>
                  <span>({property.totalReviews} reviews)</span>
                </div>
              </div>
            </div>

            <Separator />
            <div><h2 className="text-xl font-semibold text-gray-900 mb-3">About</h2><p className="text-gray-600 leading-relaxed">{property.description}</p></div>

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities & Features</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.isAC && <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg"><Wind className="h-5 w-5 text-blue-600" /><span className="text-sm font-medium text-blue-800">Air Conditioned</span></div>}
                {property.hasWifi && <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg"><Wifi className="h-5 w-5 text-indigo-600" /><span className="text-sm font-medium text-indigo-800">Free WiFi</span></div>}
                {property.foodIncluded && <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg"><Utensils className="h-5 w-5 text-orange-600" /><span className="text-sm font-medium text-orange-800">Food Included{property.foodRating ? ` (${property.foodRating}★)` : ""}</span></div>}
                {property.laundryIncluded && <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-lg"><Shirt className="h-5 w-5 text-teal-600" /><span className="text-sm font-medium text-teal-800">Laundry Included</span></div>}
                {property.hasMedical && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg"><ShieldCheck className="h-5 w-5 text-red-600" /><span className="text-sm font-medium text-red-800">Medical Facility</span></div>}
                {property.occupancy && <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"><Users className="h-5 w-5 text-gray-600" /><span className="text-sm font-medium text-gray-800">{property.occupancy}-Sharing Room</span></div>}
              </div>
            </div>

            {/* Location */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
              <Card>
                <CardContent className="p-0">
                  <GoogleMap
                    latitude={property.latitude}
                    longitude={property.longitude}
                    address={`${property.address}, ${property.city}, ${property.state} ${property.pincode}`}
                    height="256px"
                    className="rounded-t-lg overflow-hidden"
                  />
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><p className="text-sm text-gray-600">{property.address}, {property.city}, {property.state} - {property.pincode}</p></div>
                    {property.nearbyLandmark && <div className="flex items-start gap-2"><Navigation className="h-4 w-4 text-primary mt-0.5" /><p className="text-sm text-gray-600"><span className="font-medium">Nearby:</span> {property.nearbyLandmark}</p></div>}
                    {property.distanceMarket && <div className="flex items-start gap-2"><Navigation className="h-4 w-4 text-green-500 mt-0.5" /><p className="text-sm text-gray-600"><span className="font-medium">Market:</span> {property.distanceMarket}</p></div>}
                    {property.distanceInstitute && <div className="flex items-start gap-2"><Navigation className="h-4 w-4 text-blue-500 mt-0.5" /><p className="text-sm text-gray-600"><span className="font-medium">Institutions:</span> {property.distanceInstitute}</p></div>}
                    {property.nearbyMess && <div className="flex items-start gap-2"><Utensils className="h-4 w-4 text-orange-500 mt-0.5" /><p className="text-sm text-gray-600"><span className="font-medium">Nearby Mess:</span> {property.nearbyMess}</p></div>}
                    {property.nearbyLaundry && <div className="flex items-start gap-2"><Shirt className="h-4 w-4 text-teal-500 mt-0.5" /><p className="text-sm text-gray-600"><span className="font-medium">Nearby Laundry:</span> {property.nearbyLaundry}</p></div>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Rules */}
            {property.rules && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Rules & Regulations</h2>
                <Card><CardContent className="p-4">{property.rules.split("\n").map((rule, i) => (<div key={i} className="flex items-start gap-2 py-2"><AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" /><p className="text-sm text-gray-600">{rule}</p></div>))}</CardContent></Card>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews ({property.reviews?.length || 0})</h2>
              <div className="space-y-4">
                {property.reviews?.map((review) => (
                  <Card key={review.id}><CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">{review.user.name[0]}</div>
                        <span className="font-medium text-gray-900">{review.user.name}</span>
                        <span className="flex items-center gap-0.5 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><BadgeCheck className="h-3 w-3" /> Verified Stay</span>
                      </div>
                      <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />))}</div>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                    <p className="text-xs text-gray-400 mt-2">{formatDate(review.createdAt)}</p>
                  </CardContent></Card>
                ))}

                {session && hasBooking && (
                  <Card><CardHeader><CardTitle className="text-lg">Write a Review</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div><Label className="text-sm">Rating</Label>
                        <div className="flex gap-1 mt-1">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setNewRating(star)}><Star className={cn("h-6 w-6 transition-colors", star <= newRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 hover:text-yellow-300")} /></button>))}</div>
                      </div>
                      <Textarea placeholder="Share your experience..." value={newReview} onChange={(e) => setNewReview(e.target.value)} />
                      <Button onClick={handleSubmitReview} disabled={submittingReview}>{submittingReview ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit Review"}</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
              <Card className="shadow-lg"><CardContent className="p-6 space-y-4">
                {/* Pricing — show plans if available, else legacy */}
                {property.pricingPlans && property.pricingPlans.length > 0 ? (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 mb-1">Available Plans</p>
                      <p className="text-xs text-gray-400">Select a plan to book this service</p>
                    </div>
                    <div className="space-y-2">
                      {property.pricingPlans.map((plan) => (
                        <button
                          key={plan.id}
                          onClick={() => {
                            setSelectedPlanId(plan.id);
                            // Auto-set checkout from plan duration
                            const ci = checkIn || new Date().toISOString().split("T")[0];
                            if (!checkIn) setCheckIn(ci);
                            const coDate = new Date(new Date(ci).getTime() + plan.durationDays * 86400000);
                            setCheckOut(coDate.toISOString().split("T")[0]);
                          }}
                          className={cn(
                            "w-full p-3 rounded-xl border-2 text-left transition-all",
                            selectedPlanId === plan.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{plan.label}</p>
                              <p className="text-xs text-gray-500">{plan.durationDays} days</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg text-gray-900">{formatPrice(plan.price)}</p>
                              <p className="text-xs text-gray-400">{formatPrice(Math.round(plan.price / plan.durationDays))}/day</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div>
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" value={checkIn} min={new Date().toISOString().split("T")[0]} onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (selectedPlanId && e.target.value) {
                          const plan = property.pricingPlans!.find((p) => p.id === selectedPlanId);
                          if (plan) {
                            const coDate = new Date(new Date(e.target.value).getTime() + plan.durationDays * 86400000);
                            setCheckOut(coDate.toISOString().split("T")[0]);
                          }
                        }
                      }} />
                      {selectedPlanId && checkOut && (
                        <p className="text-xs text-gray-500 mt-1">Ends: {new Date(checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                      )}
                    </div>
                    <Separator />
                    {selectedPlanId && (() => {
                      const plan = property.pricingPlans!.find((p) => p.id === selectedPlanId);
                      if (!plan) return null;
                      const gst = Math.round(plan.price * (property.gstRate / 100));
                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">{plan.label} ({plan.durationDays} days)</span><span>{formatPrice(plan.price)}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">GST ({property.gstRate}%)</span><span>{formatPrice(gst)}</span></div>
                          <Separator />
                          <div className="flex justify-between font-semibold text-base"><span>Total</span><span className="text-primary">{formatPrice(plan.price + gst)}</span></div>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <div><p className="text-sm text-gray-500 line-through">{formatPrice(Math.round(property.price * 1.2))}</p><div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-gray-900">{formatPrice(property.price)}</span><span className="text-sm text-gray-500">/month</span></div><p className="text-xs text-gray-400 mt-0.5">{formatPrice(perDay)}/day</p></div>
                    <Separator />
                    <div className="space-y-3"><div><Label className="text-xs">Check-in Date</Label><Input type="date" value={checkIn} min={new Date().toISOString().split("T")[0]} onChange={(e) => { setCheckIn(e.target.value); if (checkOut && e.target.value && e.target.value >= checkOut) setCheckOut(""); }} /></div><div><Label className="text-xs">Check-out Date</Label><Input type="date" value={checkOut} min={checkIn ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]} onChange={(e) => setCheckOut(e.target.value)} /></div></div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">{formatPrice(pricing.perDay)}/day × {pricing.days} day{pricing.days !== 1 ? "s" : ""}</span><span>{formatPrice(pricing.base)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">GST ({property.gstRate}%)</span><span>{formatPrice(pricing.gst)}</span></div>
                      <Separator />
                      <div className="flex justify-between font-semibold text-base"><span>Total</span><span className="text-primary">{formatPrice(pricing.total)}</span></div>
                    </div>
                  </>
                )}
                <Button className="w-full h-12 text-base" size="lg" onClick={handleBookNow} disabled={booking}>{booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking...</> : "Book Now"}</Button>
                <Button variant="outline" className="w-full" onClick={handleAddToCart} disabled={addingToCart}>{addingToCart ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />} Add to Cart</Button>
              </CardContent></Card>

              <Card><CardContent className="p-4"><h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Cancellation Policy</h3><p className="text-sm text-gray-600 leading-relaxed">{property.cancellationPolicy || "Contact owner for cancellation policy"}</p></CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Property Owner</h3>
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="font-semibold text-primary">{property.owner.name[0]}</span></div><div><p className="font-medium text-gray-900">{property.owner.name}</p>{property.owner.phone && <p className="text-xs text-gray-500">{property.owner.phone}</p>}</div></div>
                <div className="flex gap-2 mt-3">
                  {property.owner.phone && <a href={`tel:${property.owner.phone}`} className="flex-1"><Button variant="outline" size="sm" className="w-full"><Phone className="h-3.5 w-3.5 mr-1" /> Call</Button></a>}
                  {property.owner.phone && <a href={`https://wa.me/${property.owner.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1"><Button variant="outline" size="sm" className="w-full"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Chat</Button></a>}
                </div>
              </CardContent></Card>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PLAN RESTRICTION POPUP ═══ */}
      {showPlanRestriction && property.pricingPlans && property.pricingPlans.length > 0 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPlanRestriction(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="h-14 w-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Booking Duration Restricted</h3>
              <p className="text-sm text-gray-500 mt-1">This service is only available for the following plans set by the owner:</p>
            </div>
            <div className="space-y-2 mb-4">
              {property.pricingPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div><p className="font-medium text-gray-900">{plan.label}</p><p className="text-xs text-gray-500">{plan.durationDays} days</p></div>
                  <p className="font-bold text-primary">{formatPrice(plan.price)}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">You cannot book for a custom number of days. Please select one of the plans above.</p>
            <Button className="w-full" onClick={() => setShowPlanRestriction(false)}>Got It</Button>
          </div>
        </div>
      )}

      {/* ═══ BOOKING CONFIRMATION POPUP ═══ */}
      {bookingConfirmation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-5">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Booking Confirmed!</h3>
              <p className="text-sm text-gray-500 mt-1">Your booking has been successfully placed</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Booking ID</span><span className="font-mono font-semibold text-primary">{bookingConfirmation.bookingReference}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium text-gray-900">{bookingConfirmation.propertyName}</span></div>
                {bookingConfirmation.planLabel && (
                  <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-medium text-gray-900">{bookingConfirmation.planLabel}</span></div>
                )}
                <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{bookingConfirmation.totalDays} days</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-in</span><span className="font-medium">{new Date(bookingConfirmation.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Check-out</span><span className="font-medium">{new Date(bookingConfirmation.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-500">Base Price</span><span>{formatPrice(bookingConfirmation.basePrice)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">GST</span><span>{formatPrice(bookingConfirmation.gstAmount)}</span></div>
                <Separator />
                <div className="flex justify-between font-semibold text-base"><span>Amount Paid</span><span className="text-green-600">{formatPrice(bookingConfirmation.grandTotal)}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-400">Payment ID</span><span className="text-gray-500 font-mono">{bookingConfirmation.paymentId}</span></div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="font-semibold text-gray-900 mb-1">Owner Contact</p>
                <p className="text-gray-700">{bookingConfirmation.ownerName}</p>
                {bookingConfirmation.ownerPhone && <p className="text-gray-500 text-xs">{bookingConfirmation.ownerPhone}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => { setBookingConfirmation(null); }}>Close</Button>
              <Button className="flex-1" onClick={() => { setBookingConfirmation(null); router.push("/dashboard"); }}>Go to Dashboard</Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
