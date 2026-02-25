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

    const pendingRole = searchParams.get("pendingRole")?.toUpperCase();
    const sessionRole = (session?.user as any)?.role as string;

    // If a pendingRole was requested and it differs from the current session role,
    // update the DB and refresh the JWT so the rest of the app sees the right role.
    if (pendingRole && ["STUDENT", "OWNER"].includes(pendingRole) && pendingRole !== sessionRole && !didApply.current) {
      didApply.current = true;
      fetch("/api/auth/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: pendingRole }),
      })
        .then(() => update({ role: pendingRole })) // refresh JWT in-place
        .then(() => {
          router.replace(pendingRole === "OWNER" ? "/admin/dashboard" : "/dashboard");
        })
        .catch(() => {
          // Fallback: still redirect based on pendingRole even if update failed
          router.replace(pendingRole === "OWNER" ? "/admin/dashboard" : "/dashboard");
        });
      return;
    }

    // Normal role-based redirect
    const role = pendingRole || sessionRole;
    if (role === "OWNER" || role === "ADMIN") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/dashboard");
    }
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
