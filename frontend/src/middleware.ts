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
    !pathname.startsWith("/api/university/resolve") &&
    !pathname.startsWith("/api/university/register")
  ) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|api/departments|api/courses|api/content|api/programs/public|api/academic/session|api/webhooks|api/billing|sign-in|sign-up|reset-password|landing|unauthorized|privacy|terms).*)",
  ],
};
