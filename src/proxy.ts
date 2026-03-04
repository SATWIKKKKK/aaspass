import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";

// Everything is open access EXCEPT /admin (owner area) and /chat (premium AI feature)
const protectedStudentRoutes = ["/chat"];
const protectedOwnerRoutes = ["/admin"];
const authRoutes = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ─── Superadmin route protection ───
  if (pathname.startsWith("/superadmin")) {
    // Allow login page and superadmin API routes through
    if (pathname === "/superadmin/login" || pathname.startsWith("/api/superadmin")) {
      return NextResponse.next();
    }

    // Check for superadmin JWT cookie
    const saToken = req.cookies.get("superadmin_token")?.value;
    if (!saToken) {
      return NextResponse.redirect(new URL("/superadmin/login", req.url));
    }

    try {
      const secret = process.env.SUPERADMIN_JWT_SECRET;
      if (!secret) {
        return NextResponse.redirect(new URL("/superadmin/login", req.url));
      }
      const encodedSecret = new TextEncoder().encode(secret);
      await jose.jwtVerify(saToken, encodedSecret);
      return NextResponse.next();
    } catch {
      // Invalid or expired token
      const response = NextResponse.redirect(new URL("/superadmin/login", req.url));
      response.cookies.delete("superadmin_token");
      return response;
    }
  }

  // ─── Regular auth ───
  // Check for session token cookie (next-auth v5 sets this)
  const token = req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  const hasSession = !!token;

  // Redirect logged-in users away from auth pages
  if (authRoutes.some((r) => pathname.startsWith(r)) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect student routes
  if (protectedStudentRoutes.some((r) => pathname.startsWith(r)) && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Protect owner routes
  if (protectedOwnerRoutes.some((r) => pathname.startsWith(r)) && !hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/chat/:path*",
    "/login",
    "/register",
    "/superadmin/:path*",
  ],
};
