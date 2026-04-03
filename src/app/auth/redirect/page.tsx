"use client";

// Intercepts Google OAuth callback and routes to the correct dashboard by role.
// Also handles `pendingRole` query param (set by /register when using Google OAuth)
// so that a user who registered as OWNER is correctly assigned OWNER role.
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

function AuthRedirectInner() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const hasNavigated = useRef(false);

  const hardRedirect = (path: string) => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    window.location.replace(path);
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      hardRedirect("/login");
      return;
    }

    let cancelled = false;

    const pendingRole = searchParams.get("pendingRole")?.toUpperCase();

    // Always fetch the actual role from the database — never trust the stale JWT alone
    async function resolveAndRedirect() {
      try {
        let dbRole: string | null = null;
        try {
          const res = await fetch("/api/profile", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            dbRole = data?.user?.role || null;
          }
        } catch {
          // If profile fetch fails, fall back to session role
        }

        // If a pendingRole was requested (from /register Google OAuth), apply it
        if (pendingRole && ["STUDENT", "OWNER"].includes(pendingRole)) {
          try {
            if (pendingRole !== dbRole) {
              const updateRes = await fetch("/api/auth/update-role", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: pendingRole }),
              });
              if (!updateRes.ok) {
                const payload = await updateRes.json().catch(() => null);
                throw new Error(payload?.error || "Failed to update role");
              }
            }
          } catch {
            // Continue with DB/session role fallback
          }

          if (!cancelled) {
            hardRedirect(pendingRole === "OWNER" ? "/admin/dashboard" : "/dashboard");
          }
          return;
        }

        // No pendingRole — use actual DB role (most reliable)
        const role = dbRole || (session?.user as any)?.role || "STUDENT";

        if (!cancelled) {
          if (role === "OWNER" || role === "ADMIN") {
            hardRedirect("/admin/dashboard");
          } else {
            hardRedirect("/dashboard");
          }
        }
      } catch {
        if (!cancelled) {
          // Last-resort fallback to avoid auth redirect loop.
          hardRedirect("/dashboard");
        }
      }
    }

    resolveAndRedirect();

    // Fallback timeout — if nothing happens within 8 seconds, force redirect
    const timeout = setTimeout(() => {
      if (!cancelled) {
        const role = (session?.user as any)?.role || "STUDENT";
        hardRedirect(role === "OWNER" || role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [status, session, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function AuthRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <AuthRedirectInner />
    </Suspense>
  );
}
