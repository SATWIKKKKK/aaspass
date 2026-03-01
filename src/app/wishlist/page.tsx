"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Heart, Trash2, MapPin, Star, Wifi, Wind, Utensils, Shirt, ShieldCheck,
  Users, Loader2, Building2, ShoppingCart, ChevronLeft,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumModal } from "@/components/premium-modal";
import { cn, formatPrice, SERVICE_TYPES } from "@/lib/utils";

interface WishlistProperty {
  id: string; name: string; slug: string; serviceType: string; price: number;
  gstRate: number; city: string; address: string; avgRating: number; totalReviews: number;
  isAC: boolean; hasWifi: boolean; forGender: string | null;
  foodIncluded: boolean; laundryIncluded: boolean; occupancy: number | null;
  hasMedical: boolean; nearbyLandmark: string | null;
  capacity: number | null; availableRooms: number | null;
  images: { url: string }[];
}

interface WishlistItem {
  id: string;
  propertyId: string;
  createdAt: string;
  property: WishlistProperty;
}

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    async function load() {
      try {
        const res = await fetch("/api/wishlist");
        const data = await res.json();
        if (res.ok) setItems(data.items || []);
      } catch {
        toast.error("Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [status, router]);

  const removeFromWishlist = async (propertyId: string) => {
    setRemovingId(propertyId);
    try {
      const res = await fetch(`/api/wishlist?propertyId=${propertyId}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.propertyId !== propertyId));
        toast.success("Removed from wishlist");
      } else {
        toast.error("Failed to remove");
      }
    } catch {
      toast.error("Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  const addToCart = async (property: WishlistProperty) => {
    if (!session) { router.push("/login"); return; }
    setAddingToCart(property.id);
    try {
      const ci = new Date().toISOString();
      const co = new Date(Date.now() + 30 * 86400000).toISOString();
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, checkIn: ci, checkOut: co }),
      });
      const data = await res.json();
      if (res.ok) toast.success("Added to cart!");
      else toast.error(data.error || "Failed to add to cart");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar variant="student" />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="student" onPremiumClick={() => setPremiumOpen(true)} />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/services" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Services
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-sm text-gray-500">{items.length} saved service{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Your wishlist is empty</h3>
            <p className="text-gray-500 text-sm mb-4">Save services you like and they&apos;ll appear here</p>
            <Link href="/services">
              <Button>Browse Services</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const property = item.property;
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => router.push(`/services/${property.slug}`)}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="md:w-64 lg:w-80 h-48 md:h-auto bg-gray-100 shrink-0 relative">
                      {property.images?.[0]?.url ? (
                        <img src={property.images[0].url} alt={property.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Building2 className="h-12 w-12 text-primary/30" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 p-4 md:p-5">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-gray-900">{property.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {SERVICE_TYPES.find((s) => s.value === property.serviceType)?.label || property.serviceType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                            <MapPin className="h-3.5 w-3.5" /> {property.address}, {property.city}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded">
                              <Star className="h-3.5 w-3.5 fill-green-600 text-green-600" />
                              <span className="text-sm font-semibold text-green-700">{property.avgRating.toFixed(1)}</span>
                            </div>
                            <span className="text-sm text-gray-500">({property.totalReviews} reviews)</span>
                          </div>

                          {/* Amenities */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {property.hasWifi && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-100"><Wifi className="h-3 w-3" /> WiFi</span>}
                            {property.isAC && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-100"><Wind className="h-3 w-3" /> AC</span>}
                            {property.foodIncluded && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-100"><Utensils className="h-3 w-3" /> Food</span>}
                            {property.hasMedical && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-100"><ShieldCheck className="h-3 w-3" /> Medical</span>}
                            {property.laundryIncluded && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-100"><Shirt className="h-3 w-3" /> Laundry</span>}
                            {property.forGender && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full border border-gray-100"><Users className="h-3 w-3" /> {property.forGender === "MALE" ? "Boys" : "Girls"}</span>}
                          </div>

                          {/* Availability */}
                          {property.availableRooms != null && (
                            <div className="mt-2">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full",
                                property.availableRooms <= 10
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : property.availableRooms <= 20
                                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                  : "bg-green-50 text-green-700 border border-green-200"
                              )}>
                                <span className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  property.availableRooms <= 10 ? "bg-red-500" : property.availableRooms <= 20 ? "bg-yellow-500" : "bg-green-500"
                                )} />
                                {property.availableRooms} seat{property.availableRooms !== 1 ? "s" : ""} available
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Price + Actions */}
                        <div className="text-left sm:text-right sm:ml-4 shrink-0 w-full sm:w-auto">
                          <p className="text-2xl font-bold text-gray-900">{formatPrice(property.price)}<span className="text-xs font-normal text-gray-400">/mo</span></p>

                          <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/services/${property.slug}`}>
                              <Button size="sm" className="w-full text-xs">Book Now</Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs"
                              disabled={addingToCart === property.id}
                              onClick={(e) => { e.stopPropagation(); addToCart(property); }}
                            >
                              {addingToCart === property.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5 mr-1" />} Cart
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={removingId === property.id}
                              onClick={(e) => { e.stopPropagation(); removeFromWishlist(property.id); }}
                            >
                              {removingId === property.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />} Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
