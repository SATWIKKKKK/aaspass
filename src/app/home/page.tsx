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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/navbar";
import { PremiumModal } from "@/components/premium-modal";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

// Typed session user extension
type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: string; isPremium?: boolean; };
const u = (session: { user?: object | null } | null) => session?.user as SessionUser | undefined;

const services = [
  { label: "Hostel", value: "HOSTEL", icon: Building2, color: "bg-blue-50 text-blue-600" },
  { label: "PG", value: "PG", icon: Building2, color: "bg-purple-50 text-purple-600" },
  { label: "Library", value: "LIBRARY", icon: BookOpen, color: "bg-green-50 text-green-600" },
  { label: "Coaching", value: "COACHING", icon: BookOpen, color: "bg-orange-50 text-orange-600" },
  { label: "Mess", value: "MESS", icon: Utensils, color: "bg-red-50 text-red-600" },
  { label: "Laundry", value: "LAUNDRY", icon: Shirt, color: "bg-teal-50 text-teal-600" },
  { label: "Gym", value: "GYM", icon: Dumbbell, color: "bg-pink-50 text-pink-600" },
  { label: "Co-working", value: "COWORKING", icon: Users, color: "bg-indigo-50 text-indigo-600" },
];

const offers = [
  { title: "First Booking 20% Off", description: "Use code AASPASS20 on your first hostel booking", gradient: "from-blue-500 to-blue-600", icon: Percent },
  { title: "Premium at ₹99/mo", description: "AI chat, pre-booking & 13 days late fee waiver", gradient: "from-yellow-500 to-amber-600", icon: Crown },
  { title: "Refer & Earn ₹500", description: "Invite friends and earn SuperCoins", gradient: "from-green-500 to-emerald-600", icon: Gift },
  { title: "Student Special", description: "Extra 10% off with valid student ID", gradient: "from-purple-500 to-purple-600", icon: Zap },
];

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
      { threshold: 0.05 }
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
    if (selectedService) params.set("type", selectedService);
    if (location) params.set("q", location);
    if (checkIn) params.set("from", checkIn);
    if (checkOut) params.set("to", checkOut);
    if (rooms > 1) params.set("rooms", String(rooms));
    if (guests > 1) params.set("guests", String(guests));
    router.push(`/services?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Regular Navbar — always hidden on homepage; we use the sticky combo bar instead */}
      <Navbar showSearch={false} autoHide={true} variant={session ? "student" : "public"} onPremiumClick={() => setPremiumOpen(true)} />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      {/* ─── STICKY COMBO BAR (logo + filters + auth) ─────────────────────────── */}
      {/* Slides in from top when hero scrolls out of view */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm transition-all duration-500",
        heroVisible ? "-translate-y-full opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      )}>
        {/* ── Desktop: single row ── */}
        <div className="hidden lg:flex items-center gap-2 px-4 py-2 w-full" style={{maxWidth:'1400px',marginLeft:'auto',marginRight:'auto'}}>
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-1.5 mr-2 shrink-0">
            <div className="h-7 w-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="text-base font-bold text-gray-900">AasPass</span>
          </Link>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200 shrink-0" />

          {/* Service selector */}
          <div className="shrink-0 w-36">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="h-9 text-xs border-0 bg-gray-50 focus:bg-white focus:ring-1">
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
          <div className="relative flex-1 min-w-0">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="City or area"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-8 h-9 text-xs border-0 bg-gray-50 focus:bg-white focus:ring-1 w-full"
            />
          </div>

          <div className="h-8 w-px bg-gray-200 shrink-0" />

          {/* Dates */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="pl-7 h-9 text-xs border-0 bg-gray-50 focus:bg-white focus:ring-1 w-32"
              />
            </div>
            <span className="text-gray-400 text-xs">→</span>
            <div className="relative">
              <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="pl-7 h-9 text-xs border-0 bg-gray-50 focus:bg-white focus:ring-1 w-32"
              />
            </div>
          </div>

          {/* Search button */}
          <Button onClick={handleSearch} size="sm" className="h-9 px-4 shrink-0">
            <Search className="h-3.5 w-3.5 mr-1.5" /> Search
          </Button>

          <div className="h-8 w-px bg-gray-200 shrink-0" />

          {/* Auth */}
          {session ? (
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
                </div>
                <span className="text-xs font-medium text-gray-700">{session.user?.name?.split(" ")[0]}</span>
                {u(session)?.isPremium && <Crown className="h-3 w-3 text-amber-500" />}
                <ChevronDown className="h-3 w-3 text-gray-400" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900">{session.user?.name}</p>
                    <p className="text-[10px] text-gray-500">{session.user?.email}</p>
                    {u(session)?.isPremium && (
                      <Badge className="mt-1 bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium</Badge>
                    )}
                  </div>
                  {[
                    { icon: User, label: "Personal Details", href: "/profile" },
                    { icon: LayoutDashboard, label: "My Bookings", href: "/dashboard" },
                    { icon: Crown, label: "Upgrade to Premium", action: () => { setPremiumOpen(true); setProfileOpen(false); } },
                    { icon: Settings, label: "Settings", href: "/settings" },
                  ].map((item) => (
                    item.href ? (
                      <Link key={item.label} href={item.href} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors" onClick={() => setProfileOpen(false)}>
                        <item.icon className="h-3.5 w-3.5 text-gray-400" />{item.label}
                      </Link>
                    ) : (
                      <button key={item.label} onClick={item.action} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 hover:bg-amber-50 transition-colors">
                        <item.icon className="h-3.5 w-3.5" />{item.label}
                      </button>
                    )
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button onClick={() => signOut({ callbackUrl: "/home" })} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                      <LogOut className="h-3.5 w-3.5" />Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/login"><Button variant="outline" size="sm" className="h-9 text-xs">Sign in</Button></Link>
              <Link href="/register"><Button size="sm" className="h-9 text-xs">Join Free</Button></Link>
            </div>
          )}
        </div>

        {/* ── Tablet: 2-row layout ── */}
        <div className="hidden sm:flex lg:hidden flex-col px-4 py-2 gap-2">
          <div className="flex items-center justify-between">
            <Link href="/home" className="flex items-center gap-1.5">
              <div className="h-7 w-7 bg-primary rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">A</span>
              </div>
              <span className="text-base font-bold text-gray-900">AasPass</span>
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={() => setMobileFilterOpen(!mobileFilterOpen)} className="flex items-center gap-1.5 text-xs text-gray-600 border rounded-lg px-3 py-1.5 hover:bg-gray-50">
                <Search className="h-3.5 w-3.5" />
                {selectedService || location ? `${services.find(s => s.value === selectedService)?.label || ""}${location ? ` · ${location}` : ""}` : "Search..."}
                {mobileFilterOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {session ? (
                <button onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }} className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center relative">
                  <span className="text-xs font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
                </button>
              ) : (
                <Link href="/login"><Button size="sm" className="h-8 text-xs">Sign in</Button></Link>
              )}
            </div>
          </div>
          {mobileFilterOpen && (
            <div className="grid grid-cols-2 gap-2 pb-2">
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Service" /></SelectTrigger>
                <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="relative">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-7 h-8 text-xs" />
              </div>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="h-8 text-xs" />
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-8 text-xs" />
              <Button onClick={handleSearch} size="sm" className="col-span-2 h-8 text-xs">
                <Search className="h-3.5 w-3.5 mr-1.5" />Search
              </Button>
            </div>
          )}
        </div>

        {/* ── Mobile: compact row ── */}
        <div className="flex sm:hidden items-center gap-2 px-3 py-2">
          <Link href="/home" className="shrink-0">
            <div className="h-7 w-7 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex-1 flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1.5 text-xs text-gray-500 border text-left"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{selectedService || location ? `${services.find(s => s.value === selectedService)?.label || "Any"} · ${location || "Anywhere"}` : "Search services, locations..."}</span>
          </button>
          {session ? (
            <button
              className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0"
              onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); }}
            >
              <span className="text-xs font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
            </button>
          ) : (
            <Link href="/login" className="shrink-0"><Button size="sm" className="h-8 text-xs px-2.5">Sign in</Button></Link>
          )}
        </div>

        {/* Mobile expanded filter */}
        {mobileFilterOpen && (
          <div className="sm:hidden px-3 pb-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>{services.map(s => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="relative">
              <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-7 h-9 text-xs" />
            </div>
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="h-9 text-xs" />
            <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="h-9 text-xs" />
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 border">
              <span className="text-xs text-gray-500">Rooms</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setRooms(Math.max(1, rooms - 1))} className="h-5 w-5 rounded-full border flex items-center justify-center"><Minus className="h-2.5 w-2.5" /></button>
                <span className="text-xs font-semibold w-4 text-center">{rooms}</span>
                <button onClick={() => setRooms(rooms + 1)} className="h-5 w-5 rounded-full border flex items-center justify-center"><Plus className="h-2.5 w-2.5" /></button>
              </div>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 border">
              <span className="text-xs text-gray-500">Guests</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setGuests(Math.max(1, guests - 1))} className="h-5 w-5 rounded-full border flex items-center justify-center"><Minus className="h-2.5 w-2.5" /></button>
                <span className="text-xs font-semibold w-4 text-center">{guests}</span>
                <button onClick={() => setGuests(guests + 1)} className="h-5 w-5 rounded-full border flex items-center justify-center"><Plus className="h-2.5 w-2.5" /></button>
              </div>
            </div>
            <Button onClick={handleSearch} size="sm" className="col-span-2 h-9 text-xs">
              <Search className="h-3.5 w-3.5 mr-1.5" />Search
            </Button>
          </div>
        )}
      </div>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* ─── HERO: Full-viewport, only AasPass text ─────────────────────────── */}
      <section
        ref={heroRef}
        className="relative flex flex-col items-center justify-center min-h-screen bg-white overflow-hidden"
      >
        {/* Subtle radial glow behind the text */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(var(--primary-rgb,59,130,246),0.06),transparent)] pointer-events-none" />

        <h1 className="font-black tracking-tight text-primary text-[min(22vw,180px)] leading-none select-none">
          Aas<span className="text-premium">Pass</span>
        </h1>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 flex flex-col items-center gap-2 animate-bounce opacity-40">
          <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">Scroll</span>
          <ChevronDown className="h-5 w-5 text-gray-400" />
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
            className="w-full md:w-auto md:max-w-xs bg-linear-to-br from-primary/5 to-premium/10 border border-primary/20 rounded-2xl p-5 flex items-start gap-4 hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group shrink-0"
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
          <div className="flex-1 flex flex-col justify-center px-0 md:px-6">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight">
              Get all the services to<br className="hidden sm:block" />{" "}
              <span className="text-primary">make it feel</span>{" "}
              <span className="text-premium">like your home</span>
            </p>
            <p className="mt-3 text-sm text-gray-400 font-medium">Hostels · PGs · Libraries · Coaching · Mess · Gyms & more</p>
          </div>
        </div>
      </section>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* Service Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Explore Services</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {services.map((service) => (
            <Link key={service.value} href={`/services?type=${service.value}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer group border-gray-100">
                <CardContent className="p-6 text-center">
                  <div className={cn("h-12 w-12 rounded-xl mx-auto mb-3 flex items-center justify-center", service.color)}>
                    <service.icon className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-gray-900 group-hover:text-primary transition-colors">{service.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Offers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Offers & Coupons</h2>
          <Link href="/services" className="text-primary text-sm font-medium flex items-center gap-1 hover:underline">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {offers.map((offer, i) => (
            <Card key={i} className="overflow-hidden cursor-pointer hover:shadow-lg transition-all border-0">
              <div className={cn("bg-linear-to-br text-white p-6", offer.gradient)}>
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
