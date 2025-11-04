import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/server/auth";

export async function middleware(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Protect /tutor and /progress routes
  if (pathname.startsWith("/tutor") || pathname.startsWith("/progress")) {
    if (!session) {
      const signInUrl = new URL("/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/tutor/:path*", "/progress/:path*"],
};

