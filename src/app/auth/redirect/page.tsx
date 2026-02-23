"use client";

// Intercepts Google OAuth callback and routes to the correct dashboard by role.
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthRedirectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    // Route to the correct dashboard by role
    const role = (session?.user as any)?.role;
    if (role === "OWNER") {
      router.replace("/admin/dashboard");
    } else if (role === "ADMIN") {
      router.replace("/admin/dashboard");
    } else {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
