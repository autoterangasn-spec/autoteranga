import { NextResponse, type NextRequest } from "next/server";

import { isAdminUserId, updateSession } from "@/lib/supabase/middleware";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const { url, anonKey, isConfigured } = getEnv();

    if (!isConfigured) {
      if (pathname.startsWith("/admin")) {
        return NextResponse.redirect(
          new URL("/login?error=config", request.url)
        );
      }
      if (pathname === "/") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      return NextResponse.next();
    }

    const { supabase, user, supabaseResponse } = await updateSession(
      request,
      url!,
      anonKey!
    );

    if (pathname === "/") {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.search = "";
      if (user && (await isAdminUserId(supabase, user.id))) {
        redirectUrl.pathname = "/admin/dashboard";
      } else {
        redirectUrl.pathname = "/login";
      }
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/admin")) {
      if (!user) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(redirectUrl);
      }

      const admin = await isAdminUserId(supabase, user.id);
      if (!admin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/login";
        redirectUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(redirectUrl);
      }
    }

    if (pathname === "/login" && user) {
      const admin = await isAdminUserId(supabase, user.id);
      if (admin) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin/dashboard";
        redirectUrl.search = "";
        return NextResponse.redirect(redirectUrl);
      }
    }

    return supabaseResponse;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/", "/admin/:path*", "/login"],
};
