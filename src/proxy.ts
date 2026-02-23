import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// /dashboard and /home are intentionally public — unauthenticated users can browse
const protectedStudentRoutes = ["/cart", "/notifications", "/settings", "/chat"];
const protectedOwnerRoutes = ["/admin"];
const authRoutes = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
    "/cart/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/chat/:path*",
    "/login",
    "/register",
  ],
};
