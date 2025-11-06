import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Create response
  const response = NextResponse.next();

  // Set pathname header for server components to read
  response.headers.set("x-pathname", pathname);

  // Protect /app, /tutor and /progress routes
  if (
    pathname.startsWith("/app") ||
    pathname.startsWith("/tutor") ||
    pathname.startsWith("/progress")
  ) {
    if (!session) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

