"use client";

// Intercepts Google OAuth callback and routes to the correct dashboard by role.
// Also handles `pendingRole` query param (set by /register when using Google OAuth)
// so that a user who registered as OWNER is correctly assigned OWNER role.
import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

function AuthRedirectInner() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const didApply = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (didApply.current) return;
    didApply.current = true;

    const pendingRole = searchParams.get("pendingRole")?.toUpperCase();

    // Always fetch the actual role from the database — never trust the stale JWT alone
    async function resolveAndRedirect() {
      let dbRole: string | null = null;
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        dbRole = data?.user?.role || null;
      } catch {
        // If profile fetch fails, fall back to session role
      }

      // If a pendingRole was requested (from /register Google OAuth), apply it
      if (pendingRole && ["STUDENT", "OWNER"].includes(pendingRole)) {
        if (pendingRole !== dbRole) {
          try {
            await fetch("/api/auth/update-role", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: pendingRole }),
            });
            await update({ role: pendingRole });
          } catch {
            // Continue even if update fails
          }
        } else {
          // Ensure JWT matches DB
          await update({ role: pendingRole });
        }
        router.replace(pendingRole === "OWNER" ? "/admin/dashboard" : "/dashboard");
        return;
      }

      // No pendingRole — use actual DB role (most reliable)
      const role = dbRole || (session?.user as any)?.role || "STUDENT";
      // Ensure JWT matches actual DB role
      if (role !== (session?.user as any)?.role) {
        try { await update({ role }); } catch {}
      }
      if (role === "OWNER" || role === "ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    }

    resolveAndRedirect();
  }, [status, session, router, searchParams, update]);

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
