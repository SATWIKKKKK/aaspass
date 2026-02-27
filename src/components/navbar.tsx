"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search, ShoppingCart, Bell, X, Crown, User, Settings,
  LogOut, ChevronDown, Home, LayoutDashboard, BookOpen, MessageSquare,
  Building2, Plus, Bot, ArrowLeft, Sparkles, ChevronRight,
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

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchDropdownOpen(false);
      setMobileSearchOpen(false);
      setSearchQuery("");
    }
  }, [searchQuery, router]);

  const logoHref = isOwner ? "/admin/dashboard" : "/home";

  // Profile dropdown items
  const studentDropdownItems = [
    { icon: User, label: "Personal Details", href: "/settings/profile" },
    { icon: LayoutDashboard, label: "My Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "Browse Services", href: "/services" },
    { icon: ShoppingCart, label: "Cart", href: "/cart" },
    { icon: Settings, label: "Settings", href: "/settings/edit" },
    { icon: MessageSquare, label: "Contact Support", href: "/contact" },
  ];

  const ownerDropdownItems = [
    { icon: User, label: "Personal Details", href: "/settings/profile" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Building2, label: "My Properties", href: "/admin/properties" },
    { icon: Plus, label: "Add Property", href: "/admin/properties/new" },
    { icon: Settings, label: "Settings", href: "/settings/edit" },
  ];

  const dropdownItems = isOwner ? ownerDropdownItems : studentDropdownItems;
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

              {/* Profile dropdown */}
              {session ? (
                <div className="relative profile-dropdown">
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-1.5 hover:bg-gray-100 rounded-xl p-1.5 transition"
                  >
                    {/* Avatar with crown badge */}
                    <div className="relative">
                      <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
                      </div>
                      {isPremium && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                          <Crown className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <ChevronDown className="w-3 h-3 text-gray-400 hidden md:block" />
                  </button>

                  {profileOpen && (
                    <>
                      {/* Mobile backdrop */}
                      <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setProfileOpen(false)} />

                      <div className={cn(
                        "bg-white shadow-2xl border border-gray-100 overflow-hidden z-50",
                        // Mobile: bottom sheet
                        "fixed bottom-0 left-0 right-0 rounded-t-3xl",
                        // Desktop: dropdown
                        "sm:absolute sm:bottom-auto sm:left-auto sm:right-0 sm:top-12 sm:rounded-2xl sm:w-72"
                      )}>
                        {/* Drag handle — mobile */}
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                          <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                        {/* User info */}
                        <div className="px-5 py-4 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span>
                              </div>
                              {isPremium && (
                                <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm border-2 border-white">
                                  <Crown className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 truncate">{session.user?.name}</p>
                              <p className="text-xs text-gray-400 truncate">{session.user?.email}</p>
                            </div>
                            {isPremium && (
                              <span className="shrink-0 bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Crown className="h-3 w-3" /> Premium
                              </span>
                            )}
                          </div>
                          {!isPremium && !isOwner && (
                            <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-200 mt-2">Student</Badge>
                          )}
                          {isOwner && (
                            <Badge className="bg-blue-100 text-blue-700 text-[10px] mt-2"><Building2 className="h-3 w-3 mr-0.5" />Owner</Badge>
                          )}
                        </div>

                        {/* Nav items */}
                        <div className="py-2">
                          {dropdownItems.map((item) => (
                            <Link
                              key={item.label}
                              href={item.href}
                              onClick={() => setProfileOpen(false)}
                              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition text-sm text-gray-700 font-medium"
                            >
                              <item.icon className="h-4 w-4 text-gray-400" />
                              <span>{item.label}</span>
                              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                            </Link>
                          ))}
                        </div>

                        {/* Premium CTA */}
                        {!isOwner && (
                          <div className="px-5 py-3 border-t border-gray-100">
                            <button
                              onClick={() => {
                                if (isPremium) router.push("/chat");
                                else if (onPremiumClick) { onPremiumClick(); setProfileOpen(false); }
                                else router.push("/chat");
                              }}
                              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition"
                            >
                              {isPremium ? "Open AI Chat Assistant" : "Upgrade to Premium"}
                            </button>
                          </div>
                        )}

                        {/* Sign out */}
                        <button
                          onClick={() => signOut({ callbackUrl: "/" })}
                          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 border-t border-gray-100 text-sm text-red-500 font-medium hover:bg-red-50 transition"
                        >
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </div>
                    </>
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
