import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mvp_access";

// Garde d'accès simple par mot de passe partagé pour le groupe de test.
export function middleware(request: NextRequest) {
  const password = process.env.ACCESS_PASSWORD;
  if (!password) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME);
  if (cookie?.value === password) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
