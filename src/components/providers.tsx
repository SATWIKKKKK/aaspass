"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SearchProvider } from "@/context/search-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SearchProvider>
      <TooltipProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#fff",
              color: "#333",
              border: "1px solid #e5e7eb",
            },
            success: {
              iconTheme: { primary: "#16a34a", secondary: "#fff" },
            },
            error: {
              iconTheme: { primary: "#dc2626", secondary: "#fff" },
            },
          }}
        />
      </TooltipProvider>
      </SearchProvider>
    </SessionProvider>
  );
}
