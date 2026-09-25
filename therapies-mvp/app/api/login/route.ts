import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mvp_access";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.ACCESS_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
