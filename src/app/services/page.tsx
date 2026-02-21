"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Search, MapPin, Star, Wifi, Wind, Utensils, Shirt, ShieldCheck,
  Filter, X, SlidersHorizontal, ShoppingCart,
  ArrowUpDown, Building2, Users, Heart, Loader2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice, SERVICE_TYPES } from "@/lib/utils";

interface Property {
  id: string; name: string; slug: string; serviceType: string; price: number;
  city: string; address: string; avgRating: number; totalReviews: number;
  isAC: boolean; hasWifi: boolean; forGender: string | null;
  foodIncluded: boolean; laundryIncluded: boolean; occupancy: number | null;
  cancellationPolicy: string | null; hasMedical: boolean; nearbyLandmark: string | null;
  images: { url: string; isWideShot: boolean }[];
}

const serviceTypeFilters = [{ label: "All", value: "" }, ...SERVICE_TYPES.map((st) => ({ label: st.label, value: st.value }))];

function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "");
  const [searchCity, setSearchCity] = useState(searchParams.get("city") || "");
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedGender, setSelectedGender] = useState("");
  const [isACOnly, setIsACOnly] = useState(false);
  const [hasWifiOnly, setHasWifiOnly] = useState(false);
  const [foodOnly, setFoodOnly] = useState(false);
  const [laundryOnly, setLaundryOnly] = useState(false);
  const [sortBy, setSortBy] = useState("rating");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType) params.set("serviceType", selectedType);
      if (searchCity) params.set("city", searchCity);
      if (searchQuery) params.set("q", searchQuery);
      if (sortBy === "price-low") { params.set("sortBy", "price"); params.set("sortOrder", "asc"); }
      else if (sortBy === "price-high") { params.set("sortBy", "price"); params.set("sortOrder", "desc"); }
      else if (sortBy === "reviews") params.set("sortBy", "reviews");
      else params.set("sortBy", "rating");
      const res = await fetch(`/api/properties?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setProperties(data.properties || []);
    } catch { toast.error("Failed to load properties"); }
    finally { setLoading(false); }
  }, [selectedType, searchCity, searchQuery, sortBy]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.1 });
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const filtered = properties.filter((p) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedRatings.length > 0 && !selectedRatings.some((r) => p.avgRating >= r)) return false;
    if (selectedGender && p.forGender && p.forGender !== selectedGender) return false;
    if (isACOnly && !p.isAC) return false;
    if (hasWifiOnly && !p.hasWifi) return false;
    if (foodOnly && !p.foodIncluded) return false;
    if (laundryOnly && !p.laundryIncluded) return false;
    return true;
  });

  const addToCart = async (property: Property) => {
    if (!session) { router.push("/login"); return; }
    setAddingToCart(property.id);
    try {
      const checkIn = new Date(); const checkOut = new Date(); checkOut.setMonth(checkOut.getMonth() + 1);
      const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: property.id, checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString() }) });
      const data = await res.json();
      if (res.ok) toast.success("Added to cart!");
      else toast.error(data.error || "Failed to add to cart");
    } catch { toast.error("Failed to add to cart"); }
    finally { setAddingToCart(null); }
  };

  const clearFilters = () => { setSelectedType(""); setSearchCity(""); setSelectedRatings([]); setSelectedGender(""); setIsACOnly(false); setHasWifiOnly(false); setFoodOnly(false); setLaundryOnly(false); setSearchQuery(""); };

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Service Type</h3>
        <div className="space-y-2">
          {serviceTypeFilters.map((type) => (
            <button key={type.value} onClick={() => setSelectedType(type.value)}
              className={cn("block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors", selectedType === type.value ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-50")}>{type.label}</button>
          ))}
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
        <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="City or area" value={searchCity} onChange={(e) => setSearchCity(e.target.value)} className="pl-10" /></div>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Ratings</h3>
        <div className="space-y-2">
          {[4, 3, 2].map((rating) => (
            <button key={rating} onClick={() => setSelectedRatings((prev) => prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating])}
              className={cn("flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors", selectedRatings.includes(rating) ? "bg-yellow-50 text-yellow-700" : "text-gray-600 hover:bg-gray-50")}>
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{rating}+ & above
            </button>
          ))}
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Gender</h3>
        <div className="flex gap-2">
          {[{ label: "Male", value: "MALE" }, { label: "Female", value: "FEMALE" }, { label: "Any", value: "" }].map((g) => (
            <button key={g.value} onClick={() => setSelectedGender(g.value)}
              className={cn("px-3 py-1.5 rounded-full text-sm font-medium transition-colors", selectedGender === g.value ? "bg-primary text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100")}>{g.label}</button>
          ))}
        </div>
      </div>
      <Separator />
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Amenities</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2"><Checkbox id="ac" checked={isACOnly} onCheckedChange={(c) => setIsACOnly(!!c)} /><Label htmlFor="ac" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1"><Wind className="h-3.5 w-3.5" /> AC</Label></div>
          <div className="flex items-center gap-2"><Checkbox id="wifi" checked={hasWifiOnly} onCheckedChange={(c) => setHasWifiOnly(!!c)} /><Label htmlFor="wifi" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1"><Wifi className="h-3.5 w-3.5" /> WiFi</Label></div>
          <div className="flex items-center gap-2"><Checkbox id="food" checked={foodOnly} onCheckedChange={(c) => setFoodOnly(!!c)} /><Label htmlFor="food" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1"><Utensils className="h-3.5 w-3.5" /> Food</Label></div>
          <div className="flex items-center gap-2"><Checkbox id="laundry" checked={laundryOnly} onCheckedChange={(c) => setLaundryOnly(!!c)} /><Label htmlFor="laundry" className="text-sm text-gray-600 cursor-pointer flex items-center gap-1"><Shirt className="h-3.5 w-3.5" /> Laundry</Label></div>
        </div>
      </div>
      <Button variant="outline" className="w-full" onClick={clearFilters}>Clear All Filters</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <Navbar showSearch={!heroVisible} variant={session ? ((session.user as any)?.role === "OWNER" ? "admin" : "student") : "public"} />
      <section ref={heroRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 text-center">
          <h1 className={cn("font-black tracking-tight text-primary transition-all duration-700", heroVisible ? "text-5xl sm:text-7xl opacity-100" : "text-3xl opacity-0")}>Aas<span className="text-premium">Pass</span></h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {serviceTypeFilters.map((type) => (
              <button key={type.value} onClick={() => setSelectedType(type.value)}
                className={cn("px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all", selectedType === type.value ? "bg-primary text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100 border")}>{type.label}</button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 overflow-y-auto max-h-[calc(100vh-6rem)] pb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><SlidersHorizontal className="h-5 w-5" /> Filters</h2>
              <FilterSidebar />
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">{loading ? "Loading..." : `${filtered.length} properties found`}</p>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowMobileFilters(true)}><Filter className="h-4 w-4 mr-1" /> Filters</Button>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="reviews">Most Reviews</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-4">
                {filtered.map((property) => (
                  <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-all">
                    <div className="flex flex-col md:flex-row">
                      <div className="md:w-72 h-48 md:h-auto bg-gray-100 flex-shrink-0 relative">
                        {property.images?.[0]?.url ? (<img src={property.images[0].url} alt={property.name} className="w-full h-full object-cover" />) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center"><Building2 className="h-12 w-12 text-primary/30" /></div>
                        )}
                        <button className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"><Heart className="h-4 w-4 text-gray-400" /></button>
                      </div>
                      <div className="flex-1 p-4 md:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/services/${property.slug}`}><h3 className="font-bold text-lg text-gray-900 hover:text-primary transition-colors">{property.name}</h3></Link>
                              <Badge variant="outline" className="text-xs">{SERVICE_TYPES.find((s) => s.value === property.serviceType)?.label || property.serviceType}</Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500"><MapPin className="h-3.5 w-3.5" /> {property.address}, {property.city}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded"><Star className="h-3.5 w-3.5 fill-green-600 text-green-600" /><span className="text-sm font-semibold text-green-700">{property.avgRating.toFixed(1)}</span></div>
                              <span className="text-sm text-gray-500">({property.totalReviews} reviews)</span>
                            </div>
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              {property.isAC && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"><Wind className="h-3 w-3" /> AC</span>}
                              {property.hasWifi && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"><Wifi className="h-3 w-3" /> WiFi</span>}
                              {property.foodIncluded && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"><Utensils className="h-3 w-3" /> Food</span>}
                              {property.laundryIncluded && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"><Shirt className="h-3 w-3" /> Laundry</span>}
                              {property.forGender && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"><Users className="h-3 w-3" /> {property.forGender === "MALE" ? "Boys" : "Girls"}</span>}
                              {property.hasMedical && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"><ShieldCheck className="h-3 w-3" /> Medical</span>}
                              {property.occupancy && <span className="text-xs text-gray-500">{property.occupancy}-sharing</span>}
                            </div>
                            {property.cancellationPolicy && <p className="text-xs text-green-600 mt-2">{property.cancellationPolicy}</p>}
                            {property.nearbyLandmark && <p className="text-xs text-gray-500 mt-1">Near {property.nearbyLandmark}</p>}
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="text-xs text-gray-500 line-through">{formatPrice(Math.round(property.price * 1.2))}</p>
                            <p className="text-2xl font-bold text-gray-900">{formatPrice(property.price)}</p>
                            <p className="text-xs text-gray-500">per month + GST</p>
                            <div className="mt-3 space-y-2">
                              <Link href={`/services/${property.slug}`}><Button size="sm" className="w-full">Book Now</Button></Link>
                              <Button size="sm" variant="outline" className="w-full" disabled={addingToCart === property.id} onClick={() => addToCart(property)}>
                                {addingToCart === property.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5 mr-1" />} Add to Cart
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {filtered.length === 0 && !loading && (
                  <div className="text-center py-16"><Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-semibold text-gray-900">No properties found</h3><p className="text-gray-500 mt-1">Try adjusting your filters or check back later</p><Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-white overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6"><h2 className="text-lg font-bold">Filters</h2><Button variant="ghost" size="icon" onClick={() => setShowMobileFilters(false)}><X className="h-5 w-5" /></Button></div>
            <FilterSidebar />
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full" /></div>}>
      <ServicesContent />
    </Suspense>
  );
}
