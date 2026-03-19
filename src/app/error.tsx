"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600">
          We hit an unexpected issue. You can retry, or go back to dashboard.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
