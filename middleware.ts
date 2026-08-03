import { NextResponse, type NextRequest } from "next/server";

import { getRedirectPathForRole } from "@/lib/supabase/routing";
import { getUserRole, updateSession } from "@/lib/supabase/middleware";
import type { UserRole } from "@/lib/types/database";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return {
    url,
    anonKey,
    isConfigured: Boolean(
      url && anonKey && anonKey !== "your_anon_key_here"
    ),
  };
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/login";
  redirectUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(redirectUrl);
}

function redirectByRole(request: NextRequest, role: UserRole | null) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = getRedirectPathForRole(role);
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const { url, anonKey, isConfigured } = getEnv();

    if (!isConfigured) {
      if (
        pathname.startsWith("/admin") ||
        pathname.startsWith("/client") ||
        pathname.startsWith("/prestataire")
      ) {
        return NextResponse.redirect(
          new URL("/inscription?error=config", request.url)
        );
      }
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/inscription", request.url));
      }
      return NextResponse.next();
    }

    const { supabase, user, supabaseResponse } = await updateSession(
      request,
      url!,
      anonKey!
    );

    const role = user ? await getUserRole(supabase, user.id) : null;

    if (pathname === "/") {
      if (user && role) {
        return redirectByRole(request, role);
      }
      return NextResponse.redirect(new URL("/inscription", request.url));
    }

    if (pathname.startsWith("/admin")) {
      if (!user) {
        return redirectToLogin(request, pathname);
      }

      if (role !== "admin") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (pathname.startsWith("/client")) {
      if (!user) {
        return redirectToLogin(request, pathname);
      }

      if (role !== "client") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (pathname.startsWith("/prestataire")) {
      if (!user) {
        return redirectToLogin(request, pathname);
      }

      if (role !== "prestataire") {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }

    if ((pathname === "/login" || pathname === "/inscription") && user && role) {
      return redirectByRole(request, role);
    }

    return supabaseResponse;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/client/:path*",
    "/prestataire/:path*",
    "/login",
    "/inscription",
  ],
};
