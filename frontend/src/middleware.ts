import { isArchivedApi, isArchivedStudentPage } from "@/lib/config/product";
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  /*
   * Public static assets (served from /public). Without this, files like
   * /logo.png or /bento/*.png get 307-redirected to /sign-in for anonymous
   * visitors, which breaks next/image optimization (400) on public pages.
   */
  if (
    !pathname.startsWith("/api/") &&
    /\.(png|jpe?g|gif|svg|ico|webp|avif|mp4|webm|mp3|wav|woff2?|ttf|otf)$/i.test(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  // Archived student features (lib/config/product.ts): pages fall back to the
  // chat, their APIs no longer exist.
  if (isArchivedApi(pathname)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isArchivedStudentPage(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Get session cookie to check if user is authenticated
  const sessionCookie = getSessionCookie(request);

  // /billing requires auth but is never paywalled (it IS the paywall destination)
  if (pathname.startsWith("/billing")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    return NextResponse.next();
  }

  // Protected routes that require authentication
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/student") ||
    pathname.startsWith("/faculty")
  ) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    // Paywall check is done in student layout (server component) and API paywall guard
    return NextResponse.next();
  }

  // Payment wall for chat routes
  if (pathname === "/" || pathname.startsWith("/(chat)")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    // Subscription check will be done in the page/layout components
    return NextResponse.next();
  }

  // For other protected routes
  if (
    !sessionCookie &&
    !pathname.startsWith("/sign-in") &&
    !pathname.startsWith("/sign-up") &&
    !pathname.startsWith("/pricing") &&
    !pathname.startsWith("/landing") &&
    !pathname.startsWith("/unauthorized") &&
    !pathname.startsWith("/privacy") &&
    !pathname.startsWith("/terms") &&
    !pathname.startsWith("/reset-password") &&
    !pathname.startsWith("/university/register") &&
    !pathname.startsWith("/invite/") &&
    !pathname.startsWith("/apply") &&
    // Public design-system showcase
    !pathname.startsWith("/design") &&
    // Public credential verification: the unguessable code IS the capability
    !pathname.startsWith("/verify/") &&
    !pathname.startsWith("/api/admissions/apply") &&
    !pathname.startsWith("/api/invite/") &&
    !pathname.startsWith("/api/university/resolve") &&
    !pathname.startsWith("/api/university/register") &&
    // Meta webhook: authenticated by X-Hub-Signature-256 (+ verify-token
    // handshake), not session
    !pathname.startsWith("/api/whatsapp/webhook") &&
    // Askly Capture extension: Bearer token, no cookie. /api/extension/token
    // is the extension login; /api/ingest/* validates token or session itself
    !pathname.startsWith("/api/extension/token") &&
    !pathname.startsWith("/api/ingest/") &&
    // Sign-up page needs the current session/semester before auth
    // (non-sensitive calendar fields only)
    pathname !== "/api/academic/session/current"
  ) {
    // API callers get machine-readable 401 JSON — never a 307 to /sign-in
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

// Middleware is a fast cookie-PRESENCE pre-filter only; every route still
// validates the session itself. Exclusions here skip even that pre-filter, so
// keep them to what must work without a session: better-auth's own endpoints,
// the program list used by the sign-up page, and signed provider webhooks.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|api/programs/public|api/webhooks|sign-in|sign-up|reset-password|landing|unauthorized|privacy|terms).*)",
  ],
};
