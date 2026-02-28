"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import toast from "react-hot-toast";
import {
  Search, MapPin, Calendar, Users, Building2, BookOpen, Utensils, Dumbbell, Shirt,
  Crown, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, MessageCircle,
  Star, Wifi, Wind, ShieldCheck, ShoppingCart, Loader2, X, Home, Map,
  Minus, Plus, LogOut, Settings, User, LayoutDashboard,
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PremiumModal } from "@/components/premium-modal";
import { cn, formatPrice, SERVICE_TYPES, SERVICE_CATEGORIES, serviceTypeLabel, getDailyRate, calculateDynamicPrice } from "@/lib/utils";
import { useSearch } from "@/context/search-context";

// -- Types --------------------------------------------------------------------
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; isPremium?: boolean };
const u = (s: { user?: object | null } | null) => s?.user as SessionUser | undefined;

interface Property {
  id: string; name: string; slug: string; serviceType: string; price: number;
  gstRate: number; city: string; address: string; avgRating: number; totalReviews: number;
  isAC: boolean; hasWifi: boolean; forGender: string | null;
  foodIncluded: boolean; laundryIncluded: boolean; occupancy: number | null;
  cancellationPolicy: string | null; hasMedical: boolean; nearbyLandmark: string | null;
  images: { url: string; isWideShot: boolean }[];
}

// -- Service categories (priority order) --------------------------------------
const serviceCategories = [
  { label: "Accommodation", value: "ACCOMMODATION", icon: Building2, dbTypes: "HOSTEL,PG" },
  { label: "Mess/Tiffin", value: "MESS", icon: Utensils, dbTypes: "MESS" },
  { label: "Library", value: "LIBRARY", icon: BookOpen, dbTypes: "LIBRARY" },
  { label: "Laundry", value: "LAUNDRY", icon: Shirt, dbTypes: "LAUNDRY" },
  { label: "Gym", value: "GYM", icon: Dumbbell, dbTypes: "GYM" },
];
// Legacy flat list for select dropdown
const services = serviceCategories;

// -- Date helper --------------------------------------------------------------
function fmtDate(iso: string) { if (!iso) return null; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }
const todayStr = () => new Date().toISOString().split("T")[0];

// -- DateRangePicker (same as /home) ------------------------------------------
function DateRangePicker({ checkIn, checkOut, onCheckIn, onCheckOut, compact = false }: {
  checkIn: string; checkOut: string; onCheckIn: (v: string) => void; onCheckOut: (v: string) => void; compact?: boolean;
}) {
  const inRef = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLInputElement>(null);
  const trigger = (ref: React.RefObject<HTMLInputElement | null>) => { try { ref.current?.showPicker(); } catch { ref.current?.focus(); } };
  const label = compact ? "text-[9px]" : "text-[10px]";
  const val = compact ? "text-[10px]" : "text-xs";
  const today = todayStr();
  const minCheckOut = checkIn
    ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0]
    : today;
  return (
    <div className="flex items-center gap-4 shrink-0">
      <Calendar className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "text-gray-500 shrink-0")} />
      <div className="inline-flex flex-col items-center cursor-pointer select-none group md:ml-1" onClick={() => trigger(inRef)}>
        <span className={cn(label, "font-medium text-gray-600 uppercase tracking-wide")}>From</span>
        <span className={cn(val, "font-semibold pb-0.5 min-w-17.5 text-center transition-colors whitespace-nowrap", checkIn ? "text-gray-800 border-primary" : "text-gray-400 border-gray-300 group-hover:border-primary/50")}>{fmtDate(checkIn) ?? "__/__/____"}</span>
        <input ref={inRef} type="date" value={checkIn} min={today} onChange={(e) => { onCheckIn(e.target.value); if (checkOut && e.target.value && e.target.value >= checkOut) onCheckOut(""); }} className="absolute opacity-0 w-0 h-0 pointer-events-none" tabIndex={-1} />
      </div>
      <span className="text-gray-400 text-sm font-light mx-0.5">?</span>
      <div className="inline-flex flex-col items-center cursor-pointer select-none group" onClick={() => trigger(outRef)}>
        <span className={cn(label, "font-medium text-gray-600 uppercase tracking-wide")}>To</span>
        <span className={cn(val, "font-semibold pb-0.5 min-w-17.5 text-center transition-colors whitespace-nowrap", checkOut ? "text-gray-800 border-primary" : "text-gray-400 border-gray-300 group-hover:border-primary/50")}>{fmtDate(checkOut) ?? "__/__/____"}</span>
        <input ref={outRef} type="date" value={checkOut} min={minCheckOut} onChange={(e) => onCheckOut(e.target.value)} className="absolute opacity-0 w-0 h-0 pointer-events-none" tabIndex={-1} />
      </div>
    </div>
  );
}

// -- Counter (same as /home) --------------------------------------------------
function Counter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{ minWidth: "70px" }}>
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"><Minus className="h-2.5 w-2.5 text-gray-500" /></button>
        <span className="text-sm font-semibold text-gray-800 w-4 text-center">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"><Plus className="h-2.5 w-2.5 text-gray-500" /></button>
      </div>
    </div>
  );
}

// -- Profile Dropdown (unified) -----------------------------------------------
function ProfileDropdown({ session, isPremium, profileOpen, setProfileOpen, setPremiumOpen }: {
  session: { user?: { name?: string | null; email?: string | null } | null } | null;
  isPremium?: boolean; profileOpen: boolean; setProfileOpen: (o: boolean) => void; setPremiumOpen: (o: boolean) => void;
}) {
  const isOwner = u(session)?.role === "OWNER";
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-1.5 h-10 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm">
        <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-sm font-bold text-primary">{session?.user?.name?.[0]?.toUpperCase() || "U"}</span></div>
        {isPremium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {profileOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-60">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{session?.user?.name}</p>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-200">{isOwner ? "Owner" : "Student"}</Badge>
              {isPremium && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium</Badge>}
            </div>
          </div>
          {(isOwner ? [
            { icon: User, label: "Personal Details", href: "/settings/profile" },
            { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
            { icon: Building2, label: "My Properties", href: "/admin/properties" },
            { icon: Settings, label: "Settings", href: "/settings/edit" },
          ] : [
            { icon: User, label: "Personal Details", href: "/settings/profile" },
            { icon: LayoutDashboard, label: "My Dashboard", href: "/dashboard" },
            { icon: Search, label: "Browse Services", href: "/services" },
            ...(!isPremium ? [{ icon: Crown, label: "Upgrade to Premium", action: () => { setPremiumOpen(true); setProfileOpen(false); } }] : []),
            { icon: Settings, label: "Settings", href: "/settings/edit" },
          ] as any[]).map((item: any) =>
            item.href ? (
              <Link key={item.label} href={item.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileOpen(false)}>
                <item.icon className="h-4 w-4 text-gray-400" />{item.label}
              </Link>
            ) : (
              <button key={item.label} onClick={item.action} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors">
                <item.icon className="h-4 w-4" />{item.label}
              </button>
            )
          )}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button onClick={() => signOut({ callbackUrl: "/home" })} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"><LogOut className="h-4 w-4" />Log out</button>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Image Carousel (4 images) ------------------------------------------------
function ImageCarousel({ images, name }: { images: { url: string }[]; name: string }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return (
    <div className="w-full h-full bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center"><Building2 className="h-12 w-12 text-primary/30" /></div>
  );
  return (
    <div className="relative w-full h-full group">
      <img src={images[idx]?.url} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.preventDefault(); setIdx((idx - 1 + images.length) % images.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={(e) => { e.preventDefault(); setIdx((idx + 1) % images.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"><ChevronRight className="h-4 w-4" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => <div key={i} className={cn("h-1.5 w-1.5 rounded-full transition-colors", i === idx ? "bg-white" : "bg-white/50")} />)}
          </div>
        </>
      )}
    </div>
  );
}

// -- Expandable Star Rating ---------------------------------------------------
function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 group">
        <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded">
          <Star className="h-3.5 w-3.5 fill-green-600 text-green-600" />
          <span className="text-sm font-semibold text-green-700">{rating.toFixed(1)}</span>
        </div>
        <span className="text-sm text-gray-500 group-hover:text-gray-700">({reviews} reviews)</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = reviews > 0 ? Math.round((star <= Math.round(rating) ? 60 + (star * 5) : 20 - (5 - star) * 4) ) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-gray-500">{star}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-yellow-400 rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------
// -- MAIN COMPONENT ----------------------------------------------------------
// ------------------------------------------------------------------------------
function ServicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { search, updateSearch } = useSearch();
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Combo bar state � seeded from URL params first, fallback to search context
  const [selectedService, setSelectedService] = useState(searchParams.get("type") || "");
  const [dbTypes, setDbTypes] = useState(searchParams.get("dbTypes") || "");
  const [accommodationSubFilter, setAccommodationSubFilter] = useState<"" | "HOSTEL" | "PG">("");

  // When user changes service type via dropdown, sync dbTypes + reset sub-filter
  const handleServiceChange = (value: string) => {
    setSelectedService(value);
    const cat = serviceCategories.find((c) => c.value === value);
    setDbTypes(cat ? cat.dbTypes : value);
    if (value !== "ACCOMMODATION") setAccommodationSubFilter("");
  };
  // Don't leak service-type keywords (mess, gym, etc.) into the location/city field
  const serviceKeywords = ["accommodation", "hostel", "pg", "paying guest", "mess", "tiffin", "food", "library", "study", "laundry", "washing", "gym", "fitness", "workout"];
  const qParam = searchParams.get("q") || "";
  const isQServiceKeyword = serviceKeywords.some((kw) => kw.toLowerCase() === qParam.toLowerCase());

  // If q matches a service keyword and no type is set, auto-set the service type
  useEffect(() => {
    if (isQServiceKeyword && !searchParams.get("type")) {
      const matchMap: Record<string, { value: string; dbTypes: string }> = {
        accommodation: { value: "ACCOMMODATION", dbTypes: "HOSTEL,PG" },
        hostel: { value: "ACCOMMODATION", dbTypes: "HOSTEL,PG" },
        pg: { value: "ACCOMMODATION", dbTypes: "HOSTEL,PG" },
        "paying guest": { value: "ACCOMMODATION", dbTypes: "HOSTEL,PG" },
        mess: { value: "MESS", dbTypes: "MESS" },
        tiffin: { value: "MESS", dbTypes: "MESS" },
        food: { value: "MESS", dbTypes: "MESS" },
        library: { value: "LIBRARY", dbTypes: "LIBRARY" },
        study: { value: "LIBRARY", dbTypes: "LIBRARY" },
        laundry: { value: "LAUNDRY", dbTypes: "LAUNDRY" },
        washing: { value: "LAUNDRY", dbTypes: "LAUNDRY" },
        gym: { value: "GYM", dbTypes: "GYM" },
        fitness: { value: "GYM", dbTypes: "GYM" },
        workout: { value: "GYM", dbTypes: "GYM" },
      };
      const matched = matchMap[qParam.toLowerCase()];
      if (matched) {
        setSelectedService(matched.value);
        setDbTypes(matched.dbTypes);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [location, setLocation] = useState(isQServiceKeyword ? "" : qParam);
  const [rooms, setRooms] = useState(parseInt(searchParams.get("rooms") || "1"));
  const [guests, setGuests] = useState(parseInt(searchParams.get("guests") || "1"));
  const [checkIn, setCheckIn] = useState(searchParams.get("from") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("to") || "");

  // Hydrate from search context when URL params are empty
  useEffect(() => {
    if (!searchParams.get("type") && search.serviceType) setSelectedService(search.serviceType);
    if (!searchParams.get("q") && search.location) setLocation(search.location);
    if (!searchParams.get("rooms") && search.rooms > 1) setRooms(search.rooms);
    if (!searchParams.get("guests") && search.guests > 1) setGuests(search.guests);
    if (!searchParams.get("from") && search.checkIn) setCheckIn(search.checkIn);
    if (!searchParams.get("to") && search.checkOut) setCheckOut(search.checkOut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filters
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [isACOnly, setIsACOnly] = useState(false);
  const [hasWifiOnly, setHasWifiOnly] = useState(false);
  const [genderFilter, setGenderFilter] = useState("");

  // Data
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const isPremium = u(session)?.isPremium;

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Resolve what service types to send to the API
      if (accommodationSubFilter) {
        // Specific sub-filter within Accommodation (Hostel or PG only)
        params.set("serviceType", accommodationSubFilter);
      } else if (dbTypes) {
        params.set("serviceType", dbTypes); // e.g. "HOSTEL,PG"
      } else if (selectedService) {
        // Lookup category's dbTypes
        const cat = serviceCategories.find((c) => c.value === selectedService);
        params.set("serviceType", cat ? cat.dbTypes : selectedService);
      }
      if (location) params.set("q", location);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (genderFilter) params.set("forGender", genderFilter);
      if (isACOnly) params.set("isAC", "true");
      if (hasWifiOnly) params.set("hasWifi", "true");
      params.set("sort", "avgRating");
      params.set("limit", "50");
      const res = await fetch(`/api/properties?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setProperties(data.properties || []);
    } catch { toast.error("Failed to load properties"); }
    finally { setLoading(false); }
  }, [selectedService, dbTypes, accommodationSubFilter, location, minPrice, maxPrice, genderFilter, isACOnly, hasWifiOnly]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  // Hero observer
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), { threshold: 0.1 });
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [profileOpen]);

  // Client-side filter: rating
  const filtered = properties.filter((p) => {
    if (ratingFilter && p.avgRating < parseFloat(ratingFilter)) return false;
    return true;
  });

  const handleSearch = () => {
    // Sync to persistent search context
    updateSearch({ serviceType: selectedService, location, rooms, guests, checkIn, checkOut });

    const params = new URLSearchParams();
    if (selectedService) {
      params.set("type", selectedService);
      const cat = serviceCategories.find((c) => c.value === selectedService);
      if (cat) params.set("dbTypes", cat.dbTypes);
    }
    if (location) params.set("q", location);
    if (checkIn) params.set("from", checkIn);
    if (checkOut) params.set("to", checkOut);
    if (rooms > 1) params.set("rooms", String(rooms));
    if (guests > 1) params.set("guests", String(guests));
    router.push(`/services?${params.toString()}`);
    fetchProperties();
  };

  /** Resolve the display heading � show selected service category name or "Services" */
  const headingText = selectedService
    ? (serviceCategories.find((c) => c.value === selectedService)?.label || selectedService)
    : "Services";

  const clearFilters = () => {
    setMinPrice(""); setMaxPrice(""); setRatingFilter(""); setIsACOnly(false); setHasWifiOnly(false); setGenderFilter("");
  };
  const hasActiveFilters = minPrice || maxPrice || ratingFilter || isACOnly || hasWifiOnly || genderFilter;

  const addToCart = async (property: Property) => {
    if (!session) { router.push("/login"); return; }
    setAddingToCart(property.id);
    try {
      const ci = checkIn || new Date().toISOString();
      const co = checkOut || new Date(Date.now() + 30 * 86400000).toISOString();
      const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId: property.id, checkIn: ci, checkOut: co }) });
      const data = await res.json();
      if (res.ok) toast.success("Added to cart!"); else toast.error(data.error || "Failed to add to cart");
    } catch { toast.error("Failed to add to cart"); }
    finally { setAddingToCart(null); }
  };

  return (
    <div className="min-h-screen bg-white">
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      {/* --- FLOATING HOME ICON (visible before scroll) --- */}
      {heroVisible && (
        <Link href="/home" className="fixed top-4 left-4 z-50 h-10 w-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all" title="Home">
          <Home className="h-5 w-5 text-primary" />
        </Link>
      )}

      {/* --- FLOATING PROFILE ICON (visible before scroll) --- */}
      {heroVisible && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300">
          {session ? (
            <ProfileDropdown session={session} isPremium={isPremium} profileOpen={profileOpen} setProfileOpen={setProfileOpen} setPremiumOpen={setPremiumOpen} />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="outline" size="sm" className="h-9 text-xs bg-white shadow-sm">Sign in</Button></Link>
              <Link href="/register"><Button size="sm" className="h-9 text-xs shadow-sm">Get Started</Button></Link>
            </div>
          )}
        </div>
      )}

      {/* --- STICKY NAVBAR (slides in when hero scrolls out) � exact same as /home --- */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-md transition-all duration-500",
        heroVisible ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      )}>
        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-3 px-6 py-2.5 lg:max-w-6xl xl:max-w-7xl mx-auto">
          <Link href="/home" className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0" title="Home"><Home className="h-4 w-4 text-primary" /></Link>
          <Link href="/home" className="flex items-center gap-2 shrink-0 group">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform"><span className="text-white font-bold text-sm">A</span></div>
            <span className="text-lg font-bold text-gray-900">Aas<span className="text-premium">Pass</span></span>
          </Link>
          <div className="flex-1 flex items-center gap-2 bg-white border-2 border-gray-200 rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow ml-6">
            <div className="shrink-0 w-36">
              <Select value={selectedService} onValueChange={handleServiceChange}><SelectTrigger className="h-9 text-xs border-0 bg-transparent focus:ring-0"><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs"><span className="flex items-center gap-2"><s.icon className="h-3.5 w-3.5" />{s.label}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <Counter label="Rooms" value={rooms} onChange={setRooms} />
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <Counter label="Guests" value={guests} onChange={setGuests} />
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <div className="relative flex-1 min-w-0">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="City or area" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-9 text-sm border-0 bg-transparent focus:ring-0 w-full rounded-full" />
            </div>
            <Link href={`/services/map${location ? `?location=${encodeURIComponent(location)}` : ""}`} className="h-9 w-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-colors shrink-0" title="Search on Map"><Map className="h-4 w-4 text-gray-500" /></Link>
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <div className="shrink-0"><DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} /></div>
            <Button onClick={handleSearch} size="sm" className="h-10 px-5 rounded-full shrink-0"><Search className="h-4 w-4 mr-1.5" /> Search</Button>
          </div>
          {session && <ProfileDropdown session={session} isPremium={isPremium} profileOpen={profileOpen} setProfileOpen={setProfileOpen} setPremiumOpen={setPremiumOpen} />}
        </div>

        {/* Tablet */}
        <div className="hidden sm:flex lg:hidden items-center justify-between px-4 py-2">
          <Link href="/home" className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0 mr-2" title="Home"><Home className="h-4 w-4 text-primary" /></Link>
          <Link href="/home" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
            <span className="text-lg font-bold text-gray-900">Aas<span className="text-premium">Pass</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileFilterOpen(!mobileFilterOpen)} className="flex items-center gap-2 border-2 border-gray-200 rounded-full px-4 py-3 shadow-lg hover:bg-gray-50 transition-colors ml-4">
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 max-w-32 truncate">{selectedService || location ? `${services.find(s => s.value === selectedService)?.label || "Any"} � ${location || "Anywhere"}` : "Search..."}</span>
              {mobileFilterOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {session && <ProfileDropdown session={session} isPremium={isPremium} profileOpen={profileOpen} setProfileOpen={setProfileOpen} setPremiumOpen={setPremiumOpen} />}
          </div>
        </div>

        {/* Mobile */}
        <div className="flex sm:hidden items-center gap-2 px-3 py-2">
          <Link href="/home" className="shrink-0 h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center" title="Home"><Home className="h-3.5 w-3.5 text-primary" /></Link>
          <Link href="/home" className="shrink-0"><div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div></Link>
          <button onClick={() => setMobileFilterOpen(!mobileFilterOpen)} className="flex-1 flex items-center gap-2 border-2 border-gray-200 rounded-full px-3 py-2 text-left">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500 truncate">{selectedService || location ? `${services.find(s => s.value === selectedService)?.label || "Any"} � ${location || "Anywhere"}` : "Search..."}</span>
          </button>
          {session && (
            <div onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setProfileOpen(!profileOpen)} className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-sm font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span></button>
            </div>
          )}
        </div>

        {/* Expanded filters (tablet & mobile) */}
        {mobileFilterOpen && !heroVisible && (
          <div className="lg:hidden px-4 pb-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <Select value={selectedService} onValueChange={handleServiceChange}><SelectTrigger className="h-10 text-sm border-2 border-gray-200"><SelectValue placeholder="Service" /></SelectTrigger><SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}</SelectContent></Select>
              <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-10 text-sm border-2 border-gray-200" /></div>
              <div className="col-span-2 flex items-center justify-center bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-2.5"><DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} /></div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border-2 border-gray-200"><span className="text-sm text-gray-500">Rooms</span><div className="flex items-center gap-2"><button onClick={() => setRooms(Math.max(1, rooms - 1))} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus className="h-3 w-3" /></button><span className="text-sm font-semibold w-5 text-center">{rooms}</span><button onClick={() => setRooms(rooms + 1)} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Plus className="h-3 w-3" /></button></div></div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border-2 border-gray-200"><span className="text-sm text-gray-500">Guests</span><div className="flex items-center gap-2"><button onClick={() => setGuests(Math.max(1, guests - 1))} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus className="h-3 w-3" /></button><span className="text-sm font-semibold w-5 text-center">{guests}</span><button onClick={() => setGuests(guests + 1)} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Plus className="h-3 w-3" /></button></div></div>
            </div>
            <Button onClick={() => { handleSearch(); setMobileFilterOpen(false); }} className="w-full mt-3 h-11 rounded-xl"><Search className="h-4 w-4 mr-2" />Search</Button>
          </div>
        )}
      </div>

      {/* --- HERO: AasPass text + Combo search bar (exact same as /home) --- */}
      <section ref={heroRef} className="relative pt-8 pb-4 bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(var(--primary-rgb,59,130,246),0.05),transparent)] pointer-events-none" />
        <div className="text-center pt-6 pb-8">
          <Link href="/home"><h1 className="font-black tracking-tight text-primary text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none select-none hover:opacity-80 transition-opacity">Aas<span className="text-premium">Pass</span></h1></Link>
          <p className="mt-3 text-gray-500 text-sm sm:text-base">Find accommodation, mess, libraries, laundry & more</p>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          {/* Desktop combo bar */}
          <div className="hidden lg:flex items-center gap-2 bg-white border-2 border-gray-200 rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow">
            <div className="shrink-0 w-36"><Select value={selectedService} onValueChange={handleServiceChange}><SelectTrigger className="h-9 text-xs border-0 bg-transparent focus:ring-0"><SelectValue placeholder="Select service" /></SelectTrigger><SelectContent>{services.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs"><span className="flex items-center gap-2"><s.icon className="h-3.5 w-3.5" />{s.label}</span></SelectItem>)}</SelectContent></Select></div>
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <Counter label="Rooms" value={rooms} onChange={setRooms} />
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <Counter label="Guests" value={guests} onChange={setGuests} />
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <div className="relative flex-1 min-w-0"><MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="City or area" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-9 text-sm border-0 bg-transparent focus:ring-0 w-full rounded-full" /></div>
            <Link href={`/services/map${location ? `?location=${encodeURIComponent(location)}` : ""}`} className="h-9 w-9 rounded-full border-2 border-gray-200 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-colors shrink-0" title="Search on Map"><Map className="h-4 w-4 text-gray-500" /></Link>
            <div className="h-8 w-px bg-gray-200 shrink-0" />
            <div className="shrink-0"><DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} /></div>
            <Button onClick={handleSearch} size="sm" className="h-10 px-5 rounded-full shrink-0"><Search className="h-4 w-4 mr-1.5" /> Search</Button>
          </div>
          {/* Tablet combo bar */}
          <div className="hidden sm:block lg:hidden">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-lg">
              <div className="grid grid-cols-2 gap-3">
                <Select value={selectedService} onValueChange={handleServiceChange}><SelectTrigger className="h-10 text-sm border border-gray-200"><SelectValue placeholder="Service" /></SelectTrigger><SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}</SelectContent></Select>
                <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-10 text-sm border border-gray-200" /></div>
                <div className="col-span-2 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5"><DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} /></div>
              </div>
              <Button onClick={handleSearch} className="w-full mt-3 h-11 rounded-xl"><Search className="h-4 w-4 mr-2" />Search</Button>
            </div>
          </div>
          {/* Mobile combo bar */}
          <div className="sm:hidden">
            <button onClick={() => setMobileFilterOpen(!mobileFilterOpen)} className="w-full flex items-center gap-3 bg-white border-2 border-gray-200 rounded-full px-4 py-3 shadow-lg text-left">
              <Search className="h-5 w-5 text-gray-400 shrink-0" />
              <span className="flex-1 text-gray-500 text-sm truncate">{selectedService || location ? `${services.find(s => s.value === selectedService)?.label || "Any"} � ${location || "Anywhere"}` : "Search services, locations..."}</span>
              {mobileFilterOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {mobileFilterOpen && (
              <div className="mt-3 bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-lg">
                <div className="grid grid-cols-2 gap-3">
                  <Select value={selectedService} onValueChange={handleServiceChange}><SelectTrigger className="h-10 text-sm border border-gray-200"><SelectValue placeholder="Service" /></SelectTrigger><SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}</SelectContent></Select>
                  <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-10 text-sm border border-gray-200" /></div>
                  <div className="col-span-2 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5"><DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} /></div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"><span className="text-xs text-gray-500">Rooms</span><div className="flex items-center gap-2"><button onClick={() => setRooms(Math.max(1, rooms - 1))} className="h-6 w-6 rounded-full border flex items-center justify-center"><Minus className="h-3 w-3" /></button><span className="text-sm font-semibold w-4 text-center">{rooms}</span><button onClick={() => setRooms(rooms + 1)} className="h-6 w-6 rounded-full border flex items-center justify-center"><Plus className="h-3 w-3" /></button></div></div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"><span className="text-xs text-gray-500">Guests</span><div className="flex items-center gap-2"><button onClick={() => setGuests(Math.max(1, guests - 1))} className="h-6 w-6 rounded-full border flex items-center justify-center"><Minus className="h-3 w-3" /></button><span className="text-sm font-semibold w-4 text-center">{guests}</span><button onClick={() => setGuests(guests + 1)} className="h-6 w-6 rounded-full border flex items-center justify-center"><Plus className="h-3 w-3" /></button></div></div>
                </div>
                <Button onClick={() => { handleSearch(); setMobileFilterOpen(false); }} className="w-full mt-3 h-11 rounded-xl"><Search className="h-4 w-4 mr-2" />Search</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- CHATBOX (left) + SERVICES heading (right) --- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div
            onClick={() => { if (!session) { router.push("/login"); return; } if (isPremium) router.push("/chat"); else setPremiumOpen(true); }}
            className="w-full md:w-auto md:max-w-xs bg-amber-300/10 border border-primary/20 rounded-2xl p-5 flex items-start gap-4 hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group shrink-0"
          >
            <div className="h-11 w-11 rounded-xl bg-linear-to-br from-primary to-premium flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><MessageCircle className="h-5 w-5 text-white" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-gray-900">AI Assistant</p>
                {(!session || !isPremium) && <Badge variant="premium" className="text-[10px] py-0 px-1.5"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium</Badge>}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{!session ? "Sign in to access AI-powered recommendations" : isPremium ? "Chat with AI to find your perfect stay" : "Upgrade to Premium for AI-powered help"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="flex-1 flex flex-col justify-center px-0 md:px-6">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">{headingText}</p>
            <p className="mt-2 text-sm text-gray-400 font-medium">Accommodation � Mess/Tiffin � Libraries � Laundry � Gyms & more</p>
          </div>
        </div>
      </section>

      {/* --- HORIZONTAL FILTER BAR --- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* Accommodation sub-filter: Hostel / PG */}
          {selectedService === "ACCOMMODATION" && (
            <div className="flex items-center gap-1 shrink-0 bg-gray-50 border border-gray-200 rounded-full p-1">
              {([{ value: "" as const, label: "All" }, { value: "HOSTEL" as const, label: "Hostel" }, { value: "PG" as const, label: "PG" }]).map((opt) => (
                <button key={opt.value} onClick={() => setAccommodationSubFilter(opt.value)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors", accommodationSubFilter === opt.value ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100")}>{opt.label}</button>
              ))}
            </div>
          )}

          {/* Price range */}
          <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 border border-gray-200 rounded-full px-3 py-2">
            <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Price:</span>
            <Input placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-7 w-16 text-xs border-gray-200 rounded-full px-2" />
            <span className="text-xs text-gray-400">�</span>
            <Input placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-7 w-16 text-xs border-gray-200 rounded-full px-2" />
          </div>

          {/* Ratings */}
          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="h-9 w-28 text-xs border-gray-200 rounded-full bg-gray-50 shrink-0"><Star className="h-3 w-3 mr-1 text-yellow-500" /><SelectValue placeholder="Ratings" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0" className="text-xs">All</SelectItem>
              <SelectItem value="4" className="text-xs">4+ Stars</SelectItem>
              <SelectItem value="3" className="text-xs">3+ Stars</SelectItem>
              <SelectItem value="2" className="text-xs">2+ Stars</SelectItem>
            </SelectContent>
          </Select>

          {/* AC / Non-AC */}
          <button onClick={() => setIsACOnly(!isACOnly)} className={cn("flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-medium border transition-colors shrink-0", isACOnly ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}>
            <Wind className="h-3.5 w-3.5" /> AC
          </button>

          {/* WiFi */}
          <button onClick={() => setHasWifiOnly(!hasWifiOnly)} className={cn("flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-medium border transition-colors shrink-0", hasWifiOnly ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")}>
            <Wifi className="h-3.5 w-3.5" /> WiFi
          </button>

          {/* Male / Female */}
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="h-9 w-32 text-xs border-gray-200 rounded-full bg-gray-50 shrink-0"><Users className="h-3 w-3 mr-1" /><SelectValue placeholder="Gender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0" className="text-xs">Any</SelectItem>
              <SelectItem value="MALE" className="text-xs">Male</SelectItem>
              <SelectItem value="FEMALE" className="text-xs">Female</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear */}
          {hasActiveFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 h-9 px-4 rounded-full text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors shrink-0">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </section>

      {/* --- RESULTS COUNT --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <p className="text-sm text-gray-500">{loading ? "Loading..." : `${filtered.length} services found`}</p>
      </div>

      {/* --- SERVICE LISTING CARDS --- */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No services found</h3>
            <p className="text-gray-500 mt-1">Try adjusting your filters or search criteria</p>
            <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-all">
                <div className="flex flex-col md:flex-row">
                  {/* Left: Images */}
                  <div className="md:w-80 lg:w-96 h-56 md:h-auto bg-gray-100 shrink-0 relative">
                    <ImageCarousel images={property.images} name={property.name} />
                  </div>

                  {/* Right: Details */}
                  <div className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Name + type badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/services/${property.slug}${checkIn || checkOut ? `?from=${checkIn}&to=${checkOut}` : ''}`}><h3 className="font-bold text-lg text-gray-900 hover:text-primary transition-colors">{property.name}</h3></Link>
                          <Badge variant="outline" className="text-xs">{SERVICE_TYPES.find((s) => s.value === property.serviceType)?.label || property.serviceType}</Badge>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500"><MapPin className="h-3.5 w-3.5" /> {property.address}, {property.city}</div>

                        {/* Ratings (expandable) */}
                        <div className="mt-2">
                          <StarRating rating={property.avgRating} reviews={property.totalReviews} />
                        </div>

                        {/* Cancellation policy */}
                        {property.cancellationPolicy && <p className="text-xs text-green-600 mt-2 font-medium">{property.cancellationPolicy}</p>}

                        {/* Amenities / Features */}
                        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                          {property.hasWifi && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"><Wifi className="h-3 w-3" /> WiFi</span>}
                          {property.isAC && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"><Wind className="h-3 w-3" /> AC</span>}
                          {property.foodIncluded && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"><Utensils className="h-3 w-3" /> Food</span>}
                          {property.hasMedical && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"><ShieldCheck className="h-3 w-3" /> Medical</span>}
                          {property.laundryIncluded && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"><Shirt className="h-3 w-3" /> Laundry</span>}
                          {property.forGender && <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100"><Users className="h-3 w-3" /> {property.forGender === "MALE" ? "Boys" : "Girls"}</span>}
                          {property.occupancy && <span className="text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">{property.occupancy}-sharing</span>}
                        </div>

                        {/* Nearby landmark */}
                        {property.nearbyLandmark && <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" /> Near {property.nearbyLandmark}</p>}
                      </div>

                      {/* Price + Actions (right corner) */}
                      <div className="text-left sm:text-right sm:ml-4 shrink-0 w-full sm:w-auto">
                        {(() => {
                          const pricing = calculateDynamicPrice(property.price, property.gstRate, checkIn, checkOut);
                          return (
                            <>
                              <p className="text-xs text-gray-500 line-through">{formatPrice(Math.round(property.price * 1.2))}</p>
                              <p className="text-2xl font-bold text-gray-900">{formatPrice(property.price)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                              <p className="text-xs text-gray-500">{formatPrice(pricing.perDay)}/day{checkIn && checkOut ? ` � ${pricing.days}d` : ""}</p>
                              <p className="text-xs text-gray-400 mt-0.5">Total: {formatPrice(pricing.total)} <span className="text-[10px]">(incl. {property.gstRate}% GST)</span></p>
                            </>
                          );
                        })()}

                        <div className="mt-3 space-y-2 lg:space-y-3">
                          <Link href={`/services/${property.slug}${checkIn || checkOut ? `?from=${checkIn}&to=${checkOut}` : ''}`}><Button size="sm" variant="outline" className="w-full text-xs lg:text-sm lg:h-9">View More</Button></Link>
                          <Link href={`/services/${property.slug}${checkIn || checkOut ? `?from=${checkIn}&to=${checkOut}` : ''}`}><Button size="sm" className="w-full text-xs lg:text-sm lg:h-9">Book Now</Button></Link>
                          <Button size="sm" variant="outline" className="w-full text-xs lg:text-sm lg:h-9" disabled={addingToCart === property.id} onClick={() => addToCart(property)}>
                            {addingToCart === property.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5 mr-1" />} Cart
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

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
