"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Building2,
  BookOpen,
  Utensils,
  Dumbbell,
  Shirt,
  Crown,
  ArrowRight,
  ChevronRight,
  MessageCircle,
  Gift,
  Percent,
  Zap,
  Minus,
  Plus,
  ChevronDown,
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/navbar";
import { PremiumModal } from "@/components/premium-modal";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

// Typed session user extension
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; isPremium?: boolean; };
const u = (session: { user?: object | null } | null) => session?.user as SessionUser | undefined;

// Service categories — priority ordered. Accommodation = Hostel + PG merged.
const serviceCategories = [
  { label: "Accommodation", value: "ACCOMMODATION", icon: Building2, color: "bg-blue-50 text-blue-600", dbTypes: "HOSTEL,PG" },
  { label: "Mess/Tiffin", value: "MESS", icon: Utensils, color: "bg-red-50 text-red-600", dbTypes: "MESS" },
  { label: "Library", value: "LIBRARY", icon: BookOpen, color: "bg-green-50 text-green-600", dbTypes: "LIBRARY" },
  { label: "Laundry", value: "LAUNDRY", icon: Shirt, color: "bg-teal-50 text-teal-600", dbTypes: "LAUNDRY" },
  { label: "Gym", value: "GYM", icon: Dumbbell, color: "bg-pink-50 text-pink-600", dbTypes: "GYM" },
];

// Keep a flat services list for the Select dropdown (used in combo search bar)
const services = serviceCategories;

const offers = [
  { title: "First Booking 20% Off", description: "Use code AASPASS20 on your first booking", gradient: "from-blue-500 to-blue-600", icon: Percent },
  { title: "Premium at ₹99/mo", description: "AI chat, pre-booking & 13 days late fee waiver", gradient: "from-yellow-500 to-amber-600", icon: Crown },
  { title: "Refer & Earn ₹500", description: "Invite friends and earn SuperCoins", gradient: "from-green-500 to-emerald-600", icon: Gift },
  { title: "Student Special", description: "Extra 10% off with valid student ID", gradient: "from-purple-500 to-purple-600", icon: Zap },
  { title: "Weekend Flash Sale", description: "Flat 30% off on weekend bookings this month", gradient: "from-rose-500 to-pink-600", icon: Zap },
];

// Formats "2026-02-23" → "23/02/2026"
function fmtDate(iso: string) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// DateRangePicker — hidden native inputs triggered on click
function DateRangePicker({
  checkIn, checkOut, onCheckIn, onCheckOut, compact = false,
}: {
  checkIn: string; checkOut: string;
  onCheckIn: (v: string) => void; onCheckOut: (v: string) => void;
  compact?: boolean;
}) {
  const inRef  = useRef<HTMLInputElement>(null);
  const outRef = useRef<HTMLInputElement>(null);

  const trigger = (ref: React.RefObject<HTMLInputElement | null>) => {
    try { ref.current?.showPicker(); } catch { ref.current?.focus(); }
  };

  const base = compact
    ? "inline-flex flex-col items-center cursor-pointer select-none group"
    : "inline-flex flex-col items-center cursor-pointer select-none group";

  const label = compact ? "text-[9px]" : "text-[10px]";
  const val   = compact ? "text-[10px]" : "text-xs";

  return (
    <div className="flex items-center gap-4 shrink-0">
      <Calendar className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "text-gray-500 shrink-0")} />

      {/* From */}
      <div className={cn(base, "md:ml-1")} onClick={() => trigger(inRef)}>
        <span className={cn(label, "font-medium text-gray-600 uppercase tracking-wide")}>From</span>
        <span className={cn(
          val, "font-semibold  pb-0.5 min-w-17.5 text-center transition-colors whitespace-nowrap",
          checkIn ? "text-gray-800 border-primary" : "text-gray-400 border-gray-300 group-hover:border-primary/50"
        )}>
          {fmtDate(checkIn) ?? "__/__/____"}
        </span>
        <input
          ref={inRef}
          type="date"
          value={checkIn}
          onChange={(e) => onCheckIn(e.target.value)}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>

      <span className="text-gray-400 text-sm font-light mx-0.5">→</span>

      {/* To */}
      <div className={base} onClick={() => trigger(outRef)}>
        <span className={cn(label, "font-medium text-gray-600 uppercase tracking-wide")}>To</span>
        <span className={cn(
          val, "font-semibold  pb-0.5 min-w-17.5 text-center transition-colors whitespace-nowrap",
          checkOut ? "text-gray-800 border-primary" : "text-gray-400 border-gray-300 group-hover:border-primary/50"
        )}>
          {fmtDate(checkOut) ?? "__/__/____"}
        </span>
        <input
          ref={outRef}
          type="date"
          value={checkOut}
          onChange={(e) => onCheckOut(e.target.value)}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>
    </div>
  );
}

// Counter must be defined outside component to avoid re-creating on each render
function Counter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-0.5" style={{minWidth:'70px'}}>
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Minus className="h-2.5 w-2.5 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-800 w-4 text-center">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="h-5 w-5 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Plus className="h-2.5 w-2.5 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// Profile dropdown - must be outside main component
type ProfileDropdownProps = {
  session: { user?: { name?: string | null; email?: string | null } | null } | null;
  isPremium?: boolean;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  setPremiumOpen: (open: boolean) => void;
};

function ProfileDropdown({ session, isPremium, profileOpen, setProfileOpen, setPremiumOpen }: ProfileDropdownProps) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setProfileOpen(!profileOpen)}
        className="flex items-center gap-1.5 h-10 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
      >
        <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{session?.user?.name?.[0]?.toUpperCase() || "U"}</span>
        </div>
        {isPremium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {profileOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-60">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{session?.user?.name}</p>
            <p className="text-xs text-gray-500">{session?.user?.email}</p>
            {isPremium && (
              <Badge className="mt-1.5 bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium Member</Badge>
            )}
          </div>
          {[
            { icon: User, label: "Personal Details", href: "/profile" },
            { icon: LayoutDashboard, label: "My Bookings", href: "/dashboard" },
            { icon: Crown, label: "Upgrade to Premium", action: () => { setPremiumOpen(true); setProfileOpen(false); } },
            { icon: Settings, label: "Settings", href: "/settings" },
          ].map((item) => (
            item.href ? (
              <Link key={item.label} href={item.href} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileOpen(false)}>
                <item.icon className="h-4 w-4 text-gray-400" />{item.label}
              </Link>
            ) : (
              <button key={item.label} onClick={item.action} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors">
                <item.icon className="h-4 w-4" />{item.label}
              </button>
            )
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button onClick={() => signOut({ callbackUrl: "/home" })} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="h-4 w-4" />Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const [selectedService, setSelectedService] = useState("");
  const [location, setLocation] = useState("");
  const [rooms, setRooms] = useState(1);
  const [guests, setGuests] = useState(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [profileOpen]);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedService) {
      // Map UI category to DB service types
      const cat = serviceCategories.find((c) => c.value === selectedService);
      params.set("type", selectedService);
      if (cat) params.set("dbTypes", cat.dbTypes);
    }
    if (location) params.set("q", location);
    if (checkIn) params.set("from", checkIn);
    if (checkOut) params.set("to", checkOut);
    if (rooms > 1) params.set("rooms", String(rooms));
    if (guests > 1) params.set("guests", String(guests));
    router.push(`/services?${params.toString()}`);
  };

  /** Direct-click a service category from the horizontal bar */
  const handleCategoryClick = (cat: typeof serviceCategories[number]) => {
    router.push(`/services?type=${cat.value}&dbTypes=${cat.dbTypes}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar (hidden on homepage - using custom sticky bar) */}
      <div className="hidden">
        <Navbar showSearch={false} autoHide={true} variant={session ? "student" : "public"} onPremiumClick={() => setPremiumOpen(true)} />
      </div>
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      {/* ─── FLOATING PROFILE ICON (top-right, visible BEFORE scroll) ─────────── */}
      {heroVisible && (
        <div className="fixed top-4 right-4 z-50 transition-all duration-300">
          {session ? (
            <ProfileDropdown session={session} isPremium={u(session)?.isPremium} profileOpen={profileOpen} setProfileOpen={setProfileOpen} setPremiumOpen={setPremiumOpen} />
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login"><Button variant="outline" size="sm" className="h-9 text-xs bg-white shadow-sm">Sign in</Button></Link>
              <Link href="/register"><Button size="sm" className="h-9 text-xs shadow-sm">Get Started</Button></Link>
            </div>
          )}
        </div>
      )}

      {/* ─── STICKY COMBO BAR (slides in when hero scrolls out) ─────────────── */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-md transition-all duration-500",
        heroVisible ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      )}>
        {/* ── Desktop: single row with logo ── */}
          <div className="hidden lg:flex items-center gap-3 px-6 py-2.5 lg:max-w-6xl xl:max-w-1xl mx-auto">
          {/* Logo (appears when sticky) */}
          <Link href="/home" className="flex items-center gap-2 shrink-0 group">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Aas<span className="text-premium">Pass</span></span>
          </Link>

          {/* Combo filter bar with border */}
          <div className="flex-1 flex items-center gap-2 bg-white border-2 border-gray-200 rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow ml-6">
            {/* Service selector (match hero sizing) */}
            <div className="shrink-0 w-36">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-9 text-xs border-0 bg-transparent focus:ring-0">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      <span className="flex items-center gap-2"><s.icon className="h-3.5 w-3.5" />{s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Rooms */}
            <Counter label="Rooms" value={rooms} onChange={setRooms} />

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Guests */}
            <Counter label="Guests" value={guests} onChange={setGuests} />

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Location */}
            <div className="relative shrink-0 w-60 border-2 border-gray-200 rounded-full">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="City or area"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9 h-9 text-sm border-0 bg-transparent focus:ring-0 w-full"
              />
            </div>

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Dates */}
            <div className="mr-8">
              <DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} />
            </div>

            {/* Search button */}
            <Button onClick={handleSearch} size="sm" className="h-10 px-5 rounded-full shrink-0">
              <Search className="h-4 w-4 mr-1.5" /> Search
            </Button>
          </div>

          {/* Auth (desktop) */}
          {session && (
            <ProfileDropdown session={session} isPremium={u(session)?.isPremium} profileOpen={profileOpen} setProfileOpen={setProfileOpen} setPremiumOpen={setPremiumOpen} />
          )}
        </div>

        {/* ── Tablet: logo + compact search + auth ── */}
        <div className="hidden sm:flex lg:hidden items-center justify-between px-4 py-2">
          <Link href="/home" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Aas<span className="text-premium">Pass</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="flex items-center gap-2 border-2 border-gray-200 rounded-full px-4 py-3 shadow-lg hover:bg-gray-50 transition-colors ml-4"
            >
              <Search className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 max-w-32 truncate">
                {selectedService || location ? `${services.find(s => s.value === selectedService)?.label || "Any"} · ${location || "Anywhere"}` : "Search..."}
              </span>
              {mobileFilterOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {session && (
              <ProfileDropdown session={session} isPremium={u(session)?.isPremium} profileOpen={profileOpen} setProfileOpen={setProfileOpen} setPremiumOpen={setPremiumOpen} />
            )}
          </div>
        </div>

        {/* ── Mobile: logo + pill search + avatar ── */}
        <div className="flex sm:hidden items-center gap-2 px-3 py-2">
          <Link href="/home" className="shrink-0">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex-1 flex items-center gap-2 border-2 border-gray-200 rounded-full px-3 py-2 text-left"
          >
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="text-sm text-gray-500 truncate">
              {selectedService || location ? `${services.find(s => s.value === selectedService)?.label || "Any"} · ${location || "Anywhere"}` : "Search..."}
            </span>
          </button>
          {session && (
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center"
              >
                <span className="text-sm font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Expanded filters (tablet & mobile) ── */}
        {mobileFilterOpen && !heroVisible && (
          <div className="lg:hidden px-4 pb-3 border-t border-gray-100 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-10 text-sm border-2 border-gray-200"><SelectValue placeholder="Service" /></SelectTrigger>
                <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-10 text-sm border-2 border-gray-200" />
              </div>
              <div className="col-span-2 flex items-center justify-center bg-gray-50 border-2 border-gray-200 rounded-lg px-4 py-2.5">
                <DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} />
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border-2 border-gray-200">
                <span className="text-sm text-gray-500">Rooms</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
                  <span className="text-sm font-semibold w-5 text-center">{rooms}</span>
                  <button onClick={() => setRooms(rooms + 1)} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border-2 border-gray-200">
                <span className="text-sm text-gray-500">Guests</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setGuests(Math.max(1, guests - 1))} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
                  <span className="text-sm font-semibold w-5 text-center">{guests}</span>
                  <button onClick={() => setGuests(guests + 1)} className="h-6 w-6 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
            <Button onClick={() => { handleSearch(); setMobileFilterOpen(false); }} className="w-full mt-3 h-11 rounded-xl">
              <Search className="h-4 w-4 mr-2" />Search
            </Button>
          </div>
        )}
      </div>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* ─── HERO: AasPass text + Service categories + Combo search bar below ── */}
      <section
        ref={heroRef}
        className="relative pt-8 pb-4 bg-white"
      >
        {/* Subtle radial glow behind the text */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(var(--primary-rgb,59,130,246),0.05),transparent)] pointer-events-none" />

        {/* AasPass Logo Text (medium-big, not full viewport) */}
        <div className="text-center pt-6 pb-4">
          <h1 className="font-black tracking-tight text-primary text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-none select-none">
            Aas<span className="text-premium">Pass</span>
          </h1>
          <p className="mt-3 text-gray-500 text-sm sm:text-base">Find accommodation, mess, libraries, laundry & more</p>
        </div>

        {/* ── HORIZONTAL SERVICE CATEGORY BAR ── */}
        <div className="max-w-3xl mx-auto px-4 pb-6">
          <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
            {serviceCategories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all hover:shadow-md",
                  selectedService === cat.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5"
                )}
              >
                <cat.icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── COMBO SEARCH BAR (in hero, visible on initial load) ── */}
        <div className="max-w-5xl mx-auto px-4">
          {/* Desktop: single row with border */}
          <div className="hidden lg:flex items-center gap-2 bg-white border-2 border-gray-200 rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow">
            {/* Service selector */}
            <div className="shrink-0 w-36">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-9 text-xs border-0 bg-transparent focus:ring-0">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      <span className="flex items-center gap-2"><s.icon className="h-3.5 w-3.5" />{s.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Rooms */}
            <Counter label="Rooms" value={rooms} onChange={setRooms} />

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Guests */}
            <Counter label="Guests" value={guests} onChange={setGuests} />

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Location */}
            <div className="relative shrink-0 w-60  border-2 border-gray-200 rounded-full">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="City or area"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-9 h-9 text-sm border-0 bg-transparent focus:ring-0 w-full"
              />
            </div>

            <div className="h-8 w-px bg-gray-200 shrink-0" />

            {/* Dates */}
            <div className="mr-8">
              <DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} />
            </div>
            


                        {/* Search button */}
            <Button onClick={handleSearch} size="sm" className="  h-10 px-5 rounded-full shrink-0">
              <Search className="h-4 w-4 mr-1.5" /> Search
            </Button>
          </div>

          {/* Tablet: 2-row compact bar */}
          <div className="hidden sm:block lg:hidden">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-lg">
              <div className="grid grid-cols-2 gap-3">
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="h-10 text-sm border border-gray-200"><SelectValue placeholder="Service" /></SelectTrigger>
                  <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-10 text-sm border border-gray-200" />
                </div>
                <div className="col-span-2 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                  <DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} />
                </div>
              </div>
              <Button onClick={handleSearch} className="w-full mt-3 h-11 rounded-xl">
                <Search className="h-4 w-4 mr-2" />Search
              </Button>
            </div>
          </div>

          {/* Mobile: pill search bar with expandable drawer */}
          <div className="sm:hidden">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="w-full flex items-center gap-3 bg-white border-2 border-gray-200 rounded-full px-4 py-3 shadow-lg text-left"
            >
              <Search className="h-5 w-5 text-gray-400 shrink-0" />
              <span className="flex-1 text-gray-500 text-sm truncate">
                {selectedService || location ? `${services.find(s => s.value === selectedService)?.label || "Any"} · ${location || "Anywhere"}` : "Search services, locations..."}
              </span>
              {mobileFilterOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </button>
            {mobileFilterOpen && (
              <div className="mt-3 bg-white border-2 border-gray-200 rounded-2xl p-4 shadow-lg">
                <div className="grid grid-cols-2 gap-3">
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="h-10 text-sm border border-gray-200"><SelectValue placeholder="Service" /></SelectTrigger>
                    <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-9 h-10 text-sm border border-gray-200" />
                  </div>
                  <div className="col-span-2 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                    <DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckIn={setCheckIn} onCheckOut={setCheckOut} />
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <span className="text-xs text-gray-500">Rooms</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="h-6 w-6 rounded-full border flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm font-semibold w-4 text-center">{rooms}</span>
                      <button onClick={() => setRooms(rooms + 1)} className="h-6 w-6 rounded-full border flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <span className="text-xs text-gray-500">Guests</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setGuests(Math.max(1, guests - 1))} className="h-6 w-6 rounded-full border flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm font-semibold w-4 text-center">{guests}</span>
                      <button onClick={() => setGuests(guests + 1)} className="h-6 w-6 rounded-full border flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSearch} className="w-full mt-3 h-11 rounded-xl">
                  <Search className="h-4 w-4 mr-2" />Search
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* ─── AI CHATBOX (left) + TAGLINE (right) ────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* AI Chatbox — medium width card */}
          <div
            onClick={() => {
              if (!session) { router.push("/login"); return; }
              if (u(session)?.isPremium) router.push("/chat");
              else setPremiumOpen(true);
            }}
            className="w-full md:w-auto md:max-w-xs bg-linear-to-br bg-amber-300/10 border border-primary/20 rounded-2xl p-5 flex items-start gap-4 hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group shrink-0"
          >
            <div className="h-11 w-11 rounded-xl bg-linear-to-br from-primary to-premium flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-gray-900">AI Assistant</p>
                {(!session || !u(session)?.isPremium) && (
                  <Badge variant="premium" className="text-[10px] py-0 px-1.5"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {!session
                  ? "Sign in to access AI-powered recommendations"
                  : u(session)?.isPremium
                    ? "Chat with AI to find your perfect stay"
                    : "Upgrade to Premium for AI-powered help"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 self-center group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Tagline — right side */}
          <div className="flex-1 flex flex-col justify-center px-0 md:px-6 ">
            <p className="md:mt-6      text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
              Get all the services to<br className="hidden sm:block " />{" "}
              <span className="text-primary">make it feel</span>{" "}
              <span className="text-premium">like your home</span>
            </p>
            <p className="mt-3 text-sm text-gray-400 font-medium">Accommodation · Mess/Tiffin · Libraries · Laundry · Gyms & more</p>
          </div>
        </div>
      </section>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      

      {/* Offers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Offers & Coupons</h2>
         
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {offers.map((offer, i) => (
            <Card key={i} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all border-0 bg-transparent">
              <div className={cn("h-full w-full rounded-lg bg-linear-to-br text-white p-6", offer.gradient)}>
                <offer.icon className="h-8 w-8 mb-3 opacity-90" />
                <h3 className="font-bold text-lg">{offer.title}</h3>
                <p className="text-sm mt-1 opacity-90">{offer.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits / Self Advertisement */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Why Choose AasPass?</h2>
            <p className="text-gray-600 mt-2">Trusted by thousands of students across India</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Verified Properties", description: "Every property is manually verified for quality and safety standards", icon: "🏠" },
              { title: "Best Prices", description: "Transparent pricing with no hidden charges. GST inclusive.", icon: "💰" },
              { title: "24/7 Support", description: "Our support team is always ready to help you with any issues", icon: "🛟" },
              { title: "Easy Booking", description: "Book your stay in just a few clicks. Instant confirmation.", icon: "⚡" },
              { title: "Student Reviews", description: "Read genuine reviews from verified students before booking", icon: "⭐" },
              { title: "Premium Perks", description: "AI chat, pre-booking access, and late fee waivers for premium users", icon: "👑" },
            ].map((b, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="text-3xl mb-3">{b.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
