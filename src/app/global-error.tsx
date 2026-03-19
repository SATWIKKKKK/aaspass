"use client";

import Link from "next/link";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Global error boundary caught:", error);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertOctagon className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Critical error occurred</h1>
            <p className="mt-2 text-sm text-gray-600">
              Please retry or return to the home page.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button onClick={reset}>Retry</Button>
              <Link href="/home">
                <Button variant="outline">Go Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
