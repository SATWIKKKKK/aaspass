"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  // Immediately redirect root visits to /register
  useEffect(() => {
    router.replace('/register');
  }, [router]);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const [selectedService, setSelectedService] = useState("");
  const [location, setLocation] = useState("");
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedService) params.set("type", selectedService);
    if (location) params.set("q", location);
    router.push(`/services?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar showSearch={!heroVisible} autoHide={true} variant={session ? "student" : "public"} onPremiumClick={() => setPremiumOpen(true)} />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-center">
            <h1 className={cn(
              "font-black tracking-tight text-primary transition-all duration-700",
              heroVisible ? "text-6xl sm:text-8xl lg:text-9xl opacity-100 translate-y-0" : "text-4xl opacity-0 -translate-y-10"
            )}>
              Aas<span className="text-premium">Pass</span>
            </h1>
            {session ? (
              <p className="mt-4 text-lg sm:text-xl text-gray-600">
                Hello <span className="font-semibold text-gray-900">{session.user?.name}</span>, get all your things done at one place
              </p>
            ) : (
              <p className="mt-4 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
                Get all the services to make it feel like your home
              </p>
            )}
          </div>
        </div>

        {/* Search/Filter Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-2xl shadow-lg border p-4 sm:p-6">
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
              {services.map((service) => (
                <button
                  key={service.value}
                  onClick={() => setSelectedService(service.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                    selectedService === service.value ? "bg-primary text-white shadow-md" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <service.icon className="h-4 w-4" />
                  {service.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Service</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input placeholder="City or area" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Check-in</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="date" className="pl-10" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Check-out</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input type="date" className="pl-10" />
                </div>
              </div>
              <Button onClick={handleSearch} className="h-10">
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Chatbox CTA */}
      {session && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div
            onClick={() => {
              if ((session.user as any)?.isPremium) router.push("/chat");
              else setPremiumOpen(true);
            }}
            className="bg-gradient-to-r from-primary/5 via-premium/5 to-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-premium flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">AI Assistant</p>
                <p className="text-xs text-gray-500">
                  {(session.user as any)?.isPremium ? "Chat with AI to find your perfect stay" : "Upgrade to Premium for AI-powered recommendations"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!(session.user as any)?.isPremium && <Badge variant="premium"><Crown className="h-3 w-3 mr-1" /> Premium</Badge>}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 text-center">
        <p className="text-lg text-gray-500 italic">&ldquo;Get all the services to make it feel like your home&rdquo;</p>
      </section>

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
              <div className={cn("bg-gradient-to-br text-white p-6", offer.gradient)}>
                <offer.icon className="h-8 w-8 mb-3 opacity-90" />
                <h3 className="font-bold text-lg">{offer.title}</h3>
                <p className="text-sm mt-1 opacity-90">{offer.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Benefits */}
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

      {/* Popular Cities */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Cities</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {["Delhi", "Mumbai", "Bangalore", "Kolkata", "Pune", "Jaipur", "Hyderabad", "Chennai", "Lucknow", "Bhubaneswar", "Kota", "Varanasi"].map((city) => (
            <Link key={city} href={`/services?city=${city}`}>
              <div className="bg-white border rounded-xl p-4 text-center hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                <MapPin className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">{city}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
