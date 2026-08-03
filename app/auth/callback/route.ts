import { NextResponse } from "next/server";

import { getSiteUrl } from "@/lib/supabase/env";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { getRedirectPathForRole } from "@/lib/supabase/routing";
import { createClient } from "@/lib/supabase/server";

function loginRedirect(siteUrl: string, error: string) {
  return NextResponse.redirect(`${siteUrl}/login?error=${error}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const siteUrl = getSiteUrl() || origin.replace(/\/$/, "");
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const authError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");

  if (authError || errorCode) {
    if (errorCode === "otp_expired" || authError === "access_denied") {
      return loginRedirect(siteUrl, "otp_expired");
    }
    return loginRedirect(siteUrl, "auth");
  }

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

      return NextResponse.redirect(`${siteUrl}${destination}`);
    }
  }

  return loginRedirect(siteUrl, "auth");
}
