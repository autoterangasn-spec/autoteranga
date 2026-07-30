import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, supabaseResponse };
}

export async function isAdminUserId(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
) {
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
}
