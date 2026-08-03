import { NextResponse } from "next/server";

import { getRedirectPathForRole } from "@/lib/supabase/routing";
import { createClient } from "@/lib/supabase/server";
import { getProfileForAuthUser } from "@/lib/supabase/profile";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let destination = next ?? "/client/vehicules";
      if (user) {
        const { profile } = await getProfileForAuthUser(supabase, user);
        if (profile?.role) {
          destination = next ?? getRedirectPathForRole(profile.role);
        }
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
