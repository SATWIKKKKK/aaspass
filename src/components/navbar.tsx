"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search, ShoppingCart, Bell, X, Crown, User, Settings,
  LogOut, ChevronDown, LayoutDashboard,
  Building2, Bot, ArrowLeft, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";

interface NavbarProps {
  variant?: "public" | "student" | "admin" | "minimal-student" | "minimal-admin";
  showSearch?: boolean;
  showNavLinks?: boolean;
  autoHide?: boolean;
  onPremiumClick?: () => void;
}

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  serviceType: string;
  city: string;
  price: number;
  images: { url: string }[];
}

export function Navbar({ variant = "public", showSearch = true, autoHide = false, showNavLinks = true, onPremiumClick }: NavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  const isOwner = variant === "admin" || variant === "minimal-admin";
  const isStudent = variant === "student" || variant === "minimal-student";
  const isPremium = (session?.user as any)?.isPremium;

  // Fetch notification + cart counts
  useEffect(() => {
    if (!session) return;
    fetch("/api/notifications").then((r) => r.json()).then((data) => {
      const unread = (data.notifications || []).filter((n: any) => !n.isRead).length;
      setNotifCount(unread);
    }).catch(() => {});
    if (isStudent) {
      fetch("/api/cart").then((r) => r.json()).then((data) => {
        setCartCount((data.items || []).length);
      }).catch(() => {});
    }
  }, [session, pathname, isStudent]);

  // Poll notifications every 30s
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      fetch("/api/notifications").then((r) => r.json()).then((data) => {
        const unread = (data.notifications || []).filter((n: any) => !n.isRead).length;
        setNotifCount(unread);
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [session]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".profile-dropdown")) setProfileOpen(false);
      if (!(e.target as HTMLElement).closest(".search-wrapper")) setSearchDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Lock body scroll when mobile search is open
  useEffect(() => {
    document.body.style.overflow = mobileSearchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSearchOpen]);

  // Live search — debounced
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await fetch(`/api/properties?q=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setSearchResults((data.properties || []).slice(0, 6));
    } catch { setSearchResults([]); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, doSearch]);

  // Service categories for smart search matching
  const serviceMatchMap: { keywords: string[]; value: string; dbTypes: string }[] = [
    { keywords: ["accommodation", "hostel", "pg", "paying guest"], value: "ACCOMMODATION", dbTypes: "HOSTEL,PG" },
    { keywords: ["mess", "tiffin", "food"], value: "MESS", dbTypes: "MESS" },
    { keywords: ["library", "study"], value: "LIBRARY", dbTypes: "LIBRARY" },
    { keywords: ["laundry", "washing"], value: "LAUNDRY", dbTypes: "LAUNDRY" },
    { keywords: ["gym", "fitness", "workout"], value: "GYM", dbTypes: "GYM" },
  ];

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // Check if search matches a service category
    const matched = serviceMatchMap.find((cat) =>
      cat.keywords.some((kw) => kw.toLowerCase() === q.toLowerCase())
    );

    if (matched) {
      router.push(`/services?type=${matched.value}&dbTypes=${encodeURIComponent(matched.dbTypes)}`);
    } else {
      router.push(`/services?q=${encodeURIComponent(q)}`);
    }
    setSearchDropdownOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery("");
  }, [searchQuery, router]);

  const logoHref = isOwner ? "/admin/dashboard" : "/home";

  // Profile dropdown items — exact same as /home page
  const dropdownItems: any[] = isOwner ? [
    { icon: User, label: "Personal Details", href: "/settings/profile" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Building2, label: "My Properties", href: "/admin/properties" },
    { icon: Settings, label: "Settings", href: "/settings/edit" },
  ] : [
    { icon: User, label: "Personal Details", href: "/settings/profile" },
    { icon: LayoutDashboard, label: "My Dashboard", href: "/dashboard" },
    { icon: Search, label: "Browse Services", href: "/services" },
    ...(!isPremium ? [{ icon: Crown, label: "Upgrade to Premium", action: () => { if (onPremiumClick) { onPremiumClick(); setProfileOpen(false); } } }] : []),
    { icon: Settings, label: "Settings", href: "/settings/edit" },
  ];
  const isHidden = autoHide && !showSearch;

  // Search dropdown component (shared between desktop/mobile)
  const SearchResultsDropdown = ({ results, query, onSelect }: { results: SearchResult[]; query: string; onSelect: () => void }) => (
    <>
      {results.map((s) => (
        <Link
          key={s.id}
          href={`/services/${s.slug}`}
          onClick={onSelect}
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition"
        >
          <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
            {s.images?.[0]?.url ? (
              <img src={s.images[0].url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Building2 className="h-5 w-5 text-gray-300" /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-gray-900 truncate">{s.name}</p>
            <p className="text-xs text-gray-400 capitalize">{s.serviceType.toLowerCase()} · {s.city}</p>
          </div>
          <p className="text-sm font-bold text-primary shrink-0">{formatPrice(s.price)}/mo</p>
        </Link>
      ))}
      {results.length > 0 && (
        <Link
          href={`/services?q=${encodeURIComponent(query)}`}
          onClick={onSelect}
          className="block px-4 py-3 text-center text-sm text-primary font-medium border-t border-gray-100 hover:bg-primary/5"
        >
          View all results for &ldquo;{query}&rdquo; →
        </Link>
      )}
    </>
  );

  return (
    <>
      <header className={cn(
        "bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-500",
        isHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 h-16">

            {/* Logo */}
            <Link href={logoHref} className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">AasPass</span>
            </Link>

            {/* Desktop/Tablet Search Bar (sm+) */}
            {showSearch && (
              <div className="hidden sm:flex flex-1 min-w-0 relative search-wrapper">
                <form onSubmit={handleSearchSubmit} className="w-full">
                  <div className="flex items-center w-full gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-primary focus-within:bg-white transition">
                    <Search className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search hostels, gyms, mess, PGs..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSearchDropdownOpen(true); }}
                      onFocus={() => setSearchDropdownOpen(true)}
                      className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-900 placeholder-gray-400"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); }}>
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </form>

                {/* Search results dropdown */}
                {searchDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                    <SearchResultsDropdown
                      results={searchResults}
                      query={searchQuery}
                      onSelect={() => { setSearchDropdownOpen(false); setSearchQuery(""); }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Mobile search icon */}
            {showSearch && (
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="sm:hidden p-2 rounded-xl hover:bg-gray-100 transition shrink-0"
              >
                <Search className="w-5 h-5 text-gray-600" />
              </button>
            )}

            {/* Right side icons — ALL visible on ALL devices */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto sm:ml-0">

              {/* Notifications */}
              {session && (
                <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-gray-100 transition">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Cart — students only */}
              {session && isStudent && (
                <Link href="/cart" className="relative p-2 rounded-xl hover:bg-gray-100 transition">
                  <ShoppingCart className="w-5 h-5 text-gray-600" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </Link>
              )}

              {/* AI Chat — students only */}
              {session && isStudent && (
                <button
                  onClick={() => {
                    if (isPremium) router.push("/chat");
                    else if (onPremiumClick) onPremiumClick();
                    else router.push("/chat");
                  }}
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition"
                  title={isPremium ? "AI Chat" : "Upgrade to Premium"}
                >
                  <Bot className="w-5 h-5 text-gray-600" />
                  {isPremium && (
                    <span className="absolute -top-0.5 -right-0.5 text-xs leading-none"><Sparkles className="h-3 w-3 text-amber-500" /></span>
                  )}
                </button>
              )}

              {/* Profile dropdown — matches /home exactly */}
              {session ? (
                <div className="relative profile-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-1.5 h-10 px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
                    </div>
                    {isPremium && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{session.user?.name}</p>
                        <p className="text-xs text-gray-500">{session.user?.email}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-200">{isOwner ? "Owner" : "Student"}</Badge>
                          {isPremium && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-2.5 w-2.5 mr-0.5" />Premium</Badge>}
                        </div>
                      </div>
                      {dropdownItems.map((item: any) =>
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
                        <button onClick={() => signOut({ callbackUrl: "/home" })} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                          <LogOut className="h-4 w-4" />Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                  <Link href="/register?role=STUDENT" className="hidden sm:block"><Button size="sm">Get Started</Button></Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 bg-white z-[60] flex flex-col sm:hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <button onClick={() => { setMobileSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}>
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search hostels, gyms, mess, PGs..."
                className="w-full text-base outline-none text-gray-900 placeholder-gray-400"
                autoFocus
              />
            </form>
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {searchResults.length === 0 && !searchQuery && (
              <div className="px-4 py-8 text-center">
                <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Search for hostels, gyms, mess, libraries, PGs across India</p>
              </div>
            )}
            {searchResults.length === 0 && searchQuery.length >= 2 && (
              <div className="px-4 py-8 text-center">
                <p className="text-gray-400 text-sm">No results for &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
            <SearchResultsDropdown
              results={searchResults}
              query={searchQuery}
              onSelect={() => { setMobileSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
            />
          </div>
        </div>
      )}
    </>
  );
}
