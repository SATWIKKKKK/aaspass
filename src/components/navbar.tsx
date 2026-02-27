"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Search, ShoppingCart, Bell, Menu, X, Crown, User, Settings,
  LogOut, ChevronDown, Home, LayoutDashboard, BookOpen, MessageSquare,
  Building2, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavbarProps {
  variant?: "public" | "student" | "admin" | "minimal-student" | "minimal-admin";
  showSearch?: boolean;
  showNavLinks?: boolean;
  autoHide?: boolean;
  onPremiumClick?: () => void;
}

export function Navbar({ variant = "public", showSearch = true, autoHide = false, showNavLinks = true, onPremiumClick }: NavbarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifCount, setNotifCount] = useState(0);
  const [cartCount, setCartCount] = useState(0);

  const isOwner = variant === "admin" || variant === "minimal-admin";
  const isStudent = variant === "student" || variant === "minimal-student";
  const isMinimal = variant === "minimal-student" || variant === "minimal-admin";
  const isPremium = (session?.user as any)?.isPremium;

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

  // Poll notifications every 30s for real-time updates
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

  useEffect(() => {
    const handler = () => setProfileOpen(false);
    if (profileOpen) document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [profileOpen]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) router.push(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
  }, [searchQuery, router]);

  const navLinks = isOwner ? [] : variant === "student" ? [
    { href: "/home", label: "Home", icon: Home },
    { href: "/services", label: "Services", icon: BookOpen },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/chat", label: "AI Chat", icon: MessageSquare },
  ] : [
    { href: "/home", label: "Home", icon: Home },
    { href: "/services", label: "Services", icon: BookOpen },
    { href: "#", label: "Premium", icon: Crown, isPremium: true },
    { href: "/contact", label: "Contact", icon: MessageSquare },
  ];

  const logoHref = isOwner ? "/admin/dashboard" : "/home";

  // Unified student profile dropdown — SAME everywhere
  const studentDropdownItems: any[] = [
    { icon: User, label: "Personal Details", href: "/settings/profile" },
    { icon: LayoutDashboard, label: "My Dashboard", href: "/dashboard" },
    { icon: BookOpen, label: "Browse Services", href: "/services" },
    ...(!isPremium && onPremiumClick ? [{ icon: Crown, label: "Upgrade to Premium", action: () => { onPremiumClick(); setProfileOpen(false); } }] : []),
    { icon: Settings, label: "Settings", href: "/settings/edit" },
  ];

  // Unified owner profile dropdown — NO premium
  const ownerDropdownItems: any[] = [
    { icon: User, label: "Personal Details", href: "/settings/profile" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/admin/dashboard" },
    { icon: Building2, label: "My Properties", href: "/admin/properties" },
    { icon: Plus, label: "Add Property", href: "/admin/properties/new" },
    { icon: Settings, label: "Settings", href: "/settings/edit" },
  ];

  const dropdownItems = isOwner ? ownerDropdownItems : studentDropdownItems;
  const isHidden = autoHide && !showSearch;

  return (
    <header className={cn(
      "bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-500",
      isHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href={logoHref} className="flex items-center gap-2"><div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div><span className="text-xl font-bold text-gray-900">AasPass</span></Link>
          </div>
          {showNavLinks && !isMinimal && navLinks.length > 0 && (
            <nav className="hidden md:flex items-center justify-center gap-1 flex-1">
              {navLinks.map((link) => (
                (link as any).isPremium && onPremiumClick ? (
                  <button key={link.label} onClick={onPremiumClick} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-amber-600 hover:bg-amber-50")}>
                    <link.icon className="h-4 w-4" />{link.label}
                  </button>
                ) : (
                  <Link key={link.label} href={link.href} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors", pathname === link.href ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
                    <link.icon className="h-4 w-4" />{link.label}
                  </Link>
                )
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {showSearch && (
              <div className="hidden sm:block relative">
                {searchOpen ? (
                  <form onSubmit={handleSearch} className="flex items-center">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="text" placeholder="Search services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                        className="pl-9 pr-4 py-2 w-56 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setSearchOpen(true)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Search className="h-5 w-5" /></button>
                )}
              </div>
            )}

            {session ? (
              <>
                {isStudent && (
                  <Link href="/cart" className="relative p-2 text-gray-500 hover:text-gray-700"><ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
                  </Link>
                )}
                <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700"><Bell className="h-5 w-5" />
                  {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{notifCount}</span>}
                </Link>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center"><span className="text-xs font-semibold text-primary">{session.user?.name?.[0]?.toUpperCase() || "U"}</span></div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">{session.user?.name?.split(" ")[0]}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50" onClick={() => setProfileOpen(false)}>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{session.user?.name}</p><p className="text-xs text-gray-500">{session.user?.email}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-200">{isOwner ? "Owner" : "Student"}</Badge>
                          {!isOwner && isPremium && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-3 w-3 mr-0.5" />Premium</Badge>}
                        </div>
                      </div>
                      {dropdownItems.map((item: any) =>
                        item.href ? (
                          <Link key={item.label} href={item.href} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><item.icon className="h-4 w-4 text-gray-400" />{item.label}</Link>
                        ) : (
                          <button key={item.label} onClick={item.action} className="flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 w-full text-left"><item.icon className="h-4 w-4" />{item.label}</button>
                        )
                      )}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"><LogOut className="h-4 w-4" />Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link href="/register?role=STUDENT"><Button size="sm">Get Started</Button></Link>
              </div>
            )}

            {showNavLinks && !isMinimal && navLinks.length > 0 && (
              <button className="md:hidden p-2 text-gray-500" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
            )}
          </div>
        </div>

        {mobileMenuOpen && showNavLinks && !isMinimal && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.label} href={link.href} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium", pathname === link.href ? "bg-primary/10 text-primary" : "text-gray-600")} onClick={() => setMobileMenuOpen(false)}>
                <link.icon className="h-4 w-4" />{link.label}
              </Link>
            ))}
            <form onSubmit={handleSearch} className="px-3 pt-2"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div></form>
          </div>
        )}
      </div>
    </header>
  );
}
