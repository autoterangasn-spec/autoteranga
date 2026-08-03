import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type MiddlewareSupabaseClient = ReturnType<typeof createServerClient>;

export async function updateSession(
  request: NextRequest,
  supabaseUrl: string,
  supabaseAnonKey: string
) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { supabase, user: user ?? null, supabaseResponse };
  } catch {
    return { supabase, user: null, supabaseResponse };
  }
}

export async function isAdminUserId(
  supabase: MiddlewareSupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const byAuthUserId = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (byAuthUserId.data?.role === "admin") return true;

    const byId = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (byId.data?.role === "admin") return true;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id === userId && user.app_metadata?.role === "admin") {
      return true;
    }

    if (user?.email) {
      const byEmail = await supabase
        .from("profiles")
        .select("role")
        .eq("email", user.email)
        .maybeSingle();

      if (byEmail.data?.role === "admin") return true;
    }

    return false;
  } catch {
    return false;
  }
}
