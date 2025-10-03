import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

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

  // Protected routes that require authentication
  if (pathname.startsWith("/admin") || pathname.startsWith("/student") || pathname.startsWith("/faculty")) {
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    
    // For now, allow access if session exists
    // Detailed role-based authorization will be handled at the page level
    return NextResponse.next();
  }

  // For other protected routes
  if (!sessionCookie && !pathname.startsWith("/sign-in") && !pathname.startsWith("/sign-up") && !pathname.startsWith("/unauthorized")) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|api/departments|api/courses|api/content|sign-in|sign-up|unauthorized).*)",
  ],
};
