import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // All routes are accessible - auth is handled at the API/page level.
  // Anonymous users get value first; signup is prompted after plan creation.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
