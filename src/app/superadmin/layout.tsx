"use client";

import { useState, useEffect, useCallback } from "react";
import { gsap } from "@/lib/gsap";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, CalendarCheck, Gift, Crown,
  ShieldAlert, BarChart3, FileText, Settings, LogOut, Menu, X,
  ChevronRight, Shield, Megaphone, Percent, Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const navItems = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/users", label: "Users", icon: Users },
  { href: "/superadmin/services", label: "Services", icon: Building2 },
  { href: "/superadmin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/superadmin/offers", label: "Offers", icon: Gift },
  { href: "/superadmin/premium", label: "Premium", icon: Crown },
  { href: "/superadmin/violations", label: "Violations", icon: ShieldAlert },
  { href: "/superadmin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/superadmin/commission", label: "Commission", icon: Percent },
  { href: "/superadmin/payouts", label: "Payouts", icon: Wallet },
  { href: "/superadmin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/superadmin/audit", label: "Audit Logs", icon: FileText },
  { href: "/superadmin/settings", label: "Settings", icon: Settings },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginRoute = pathname === "/superadmin/login";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [sessionWarning, setSessionWarning] = useState(false);

  // Fetch admin info (skip on login page)
  useEffect(() => {
    if (isLoginRoute) return;
    fetch("/api/superadmin/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.admin) setAdminName(data.admin.name);
        else router.push("/superadmin/login");
      })
      .catch(() => router.push("/superadmin/login"));
  }, [router, isLoginRoute]);

  // Session expiry warning (skip on login page)
  useEffect(() => {
    if (isLoginRoute) return;
    const warningTimer = setTimeout(() => {
      setSessionWarning(true);
    }, 105 * 60 * 1000); // 1h 45m

    const expiryTimer = setTimeout(() => {
      toast.error("Session expired. Please log in again.");
      router.push("/superadmin/login");
    }, 120 * 60 * 1000); // 2h

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiryTimer);
    };
  }, [router, isLoginRoute]);

  // GSAP sidebar nav stagger on mount (skip on login page)
  useEffect(() => {
    if (isLoginRoute) return;
    gsap.fromTo("[data-gsap='sa-nav']", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.04, ease: "power3.out", delay: 0.1 });
  }, [isLoginRoute]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/superadmin/auth/logout", { method: "POST" });
    router.push("/superadmin/login");
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/superadmin") return pathname === "/superadmin";
    return pathname.startsWith(href);
  };

  // If this is the login route, render children without the sidebar/layout chrome
  if (isLoginRoute) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* Session Warning Modal */}
      {sessionWarning && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Session Expiring Soon</h3>
                <p className="text-sm text-gray-500">Your session will expire in 15 minutes.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setSessionWarning(false)} className="flex-1">
                Dismiss
              </Button>
              <Button onClick={handleLogout} className="flex-1">
                Log Out Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">AasPass</span>
            <span className="text-[10px] text-primary font-medium block -mt-0.5">Super Admin</span>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                data-gsap="sa-nav"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-gray-400")} />
                {item.label}
                {active && <ChevronRight className="h-3.5 w-3.5 ml-auto text-primary/60" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold text-gray-900">
              {navItems.find((n) => isActive(n.href))?.label || "Super Admin"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{adminName || "Super Admin"}</p>
              <p className="text-[10px] text-gray-500">Administrator</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
