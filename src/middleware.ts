import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "bunker_session";

// Public paths that do not require authentication
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
];

// Helper to check if a JWT is structurally valid and not expired
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Decode JWT payload (base64url)
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    // Check expiration if present
    if (payload.exp && typeof payload.exp === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSeconds) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function getJwtPayload(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Ignore static assets, internal Next.js files, and public images
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname === "/bunker-logo.png" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const tokenPayload = sessionCookie ? getJwtPayload(sessionCookie) : null;
  const isAuthenticated = Boolean(sessionCookie && isTokenValid(sessionCookie));

  // 2. Handle root route "/"
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 3. Handle login page access
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 4. For private CRM / app pages
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/crm") ||
    pathname.startsWith("/marketing") ||
    pathname.startsWith("/messaging") ||
    pathname.startsWith("/automations") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");

  if (isProtectedPath) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/dashboard") {
        loginUrl.searchParams.set("callbackUrl", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // 5. Client role redirection from internal Bunker Agency admin pages
    const userRole = tokenPayload?.user_metadata?.role?.toUpperCase();
    const hasClientId = Boolean(tokenPayload?.user_metadata?.clientId);
    const isClientUser = userRole === "CLIENT" || hasClientId;

    const isAdminOnlyPath =
      pathname.startsWith("/marketing") ||
      pathname.startsWith("/settings") ||
      pathname.startsWith("/automations");

    if (isClientUser && isAdminOnlyPath) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
