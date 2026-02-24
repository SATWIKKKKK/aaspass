"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  MapPin, Star, Wifi, Wind, Utensils, Shirt, ShieldCheck, Users, Phone, MessageSquare,
  Share2, Heart, ChevronLeft, ShoppingCart, Building2, Navigation,
  CheckCircle2, AlertCircle, Loader2,
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
import { cn, formatPrice, calculateGST, formatDate, SERVICE_TYPES } from "@/lib/utils";

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
}

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [newReview, setNewReview] = useState("");
  const [newRating, setNewRating] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [booking, setBooking] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/properties/${params.slug}`);
        if (res.ok) { const data = await res.json(); setProperty(data.property); }
        else toast.error("Property not found");
      } catch { toast.error("Failed to load property"); }
      finally { setLoading(false); }
    }
    if (params.slug) load();
  }, [params.slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center"><p>Property not found</p></div>;

  const { base, gst, total } = calculateGST(property.price, property.gstRate);

  const handleBookNow = async () => {
    if (!session) { router.push("/login"); return; }
    if (!checkIn || !checkOut) { toast.error("Please select check-in and check-out dates"); return; }
    setBooking(true);
    try {
      const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, checkIn, checkOut }) });
      const data = await res.json();
      if (res.ok) { toast.success("Booking confirmed!"); router.push("/dashboard"); }
      else toast.error(data.error || "Booking failed");
    } catch { toast.error("Booking failed"); }
    finally { setBooking(false); }
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
      <Navbar variant={session ? ((session.user as any)?.role === "OWNER" ? "admin" : "student") : "public"} />
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
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
                <Badge variant="outline">
                  {SERVICE_TYPES.find((s) => s.value === property.serviceType)?.label || property.serviceType}
                </Badge>
                {property.forGender && (
                  <Badge variant={property.forGender === "MALE" ? "default" : "secondary"}>
                    <Users className="h-3 w-3 mr-1" /> {property.forGender === "MALE" ? "Boys" : "Girls"} Only
                  </Badge>
                )}
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
                      </div>
                      <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => (<Star key={i} className={cn("h-3.5 w-3.5", i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />))}</div>
                    </div>
                    {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                    <p className="text-xs text-gray-400 mt-2">{formatDate(review.createdAt)}</p>
                  </CardContent></Card>
                ))}

                {session && (
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
                <div><p className="text-sm text-gray-500 line-through">{formatPrice(Math.round(property.price * 1.2))}</p><div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-gray-900">{formatPrice(property.price)}</span><span className="text-sm text-gray-500">/month</span></div></div>
                <Separator />
                <div className="space-y-3"><div><Label className="text-xs">Check-in Date</Label><Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div><div><Label className="text-xs">Check-out Date</Label><Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div></div>
                <Separator />
                <div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-gray-500">Base Price</span><span>{formatPrice(base)}</span></div><div className="flex justify-between"><span className="text-gray-500">GST ({property.gstRate}%)</span><span>{formatPrice(gst)}</span></div><Separator /><div className="flex justify-between font-semibold text-base"><span>Total</span><span className="text-primary">{formatPrice(total)}</span></div></div>
                <Button className="w-full h-12 text-base" size="lg" onClick={handleBookNow} disabled={booking}>{booking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Booking...</> : "Book Now"}</Button>
                <Button variant="outline" className="w-full" onClick={handleAddToCart} disabled={addingToCart}>{addingToCart ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />} Add to Cart</Button>
              </CardContent></Card>

              <Card><CardContent className="p-4"><h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Cancellation Policy</h3><p className="text-sm text-gray-600 leading-relaxed">{property.cancellationPolicy || "Contact owner for cancellation policy"}</p></CardContent></Card>

              <Card><CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Property Owner</h3>
                <div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="font-semibold text-primary">{property.owner.name[0]}</span></div><div><p className="font-medium text-gray-900">{property.owner.name}</p>{property.owner.phone && <p className="text-xs text-gray-500">{property.owner.phone}</p>}</div></div>
                <div className="flex gap-2 mt-3">
                  {property.owner.phone && <a href={`tel:${property.owner.phone}`} className="flex-1"><Button variant="outline" size="sm" className="w-full"><Phone className="h-3.5 w-3.5 mr-1" /> Call</Button></a>}
                  <Link href="/chat" className="flex-1"><Button variant="outline" size="sm" className="w-full"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Chat</Button></Link>
                </div>
              </CardContent></Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
