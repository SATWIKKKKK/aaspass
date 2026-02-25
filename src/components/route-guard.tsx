"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteGuardProps {
  /** Which role is allowed on this page */
  allowedRole: "STUDENT" | "OWNER";
  children: React.ReactNode;
}

export function RouteGuard({ allowedRole, children }: RouteGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [denied, setDenied] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    const role = (session?.user as any)?.role as string;

    if (allowedRole === "STUDENT" && (role === "OWNER" || role === "ADMIN")) {
      setDenied(true);
      setChecking(false);
    } else if (allowedRole === "OWNER" && role !== "OWNER" && role !== "ADMIN") {
      setDenied(true);
      setChecking(false);
    } else {
      setDenied(false);
      setChecking(false);
    }
  }, [status, session, allowedRole, router]);

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (denied) {
    const isOwnerBlocked = allowedRole === "STUDENT";
    const message = isOwnerBlocked
      ? "Access Denied: This area is for students only. Please return to your Owner Dashboard."
      : "Access Denied: This area is for service providers only.";
    const redirectPath = isOwnerBlocked ? "/admin/dashboard" : "/dashboard";
    const buttonLabel = isOwnerBlocked ? "Go to Owner Dashboard" : "Go to Student Dashboard";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <Button onClick={() => router.replace(redirectPath)} className="w-full">
            {buttonLabel}
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
