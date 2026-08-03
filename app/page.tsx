import { redirect } from "next/navigation";

import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { getRedirectPathForRole } from "@/lib/supabase/routing";
import { createClient } from "@/lib/supabase/server";

interface HomePageProps {
  searchParams?: { error?: string; error_code?: string };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  if (
    searchParams?.error_code === "otp_expired" ||
    searchParams?.error === "access_denied"
  ) {
    redirect("/login?error=otp_expired");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { profile } = await getProfileForAuthUser(supabase, user);
      if (profile?.role) {
        redirect(getRedirectPathForRole(profile.role));
      }
    }
  } catch {
    // Fall through to default public entry point.
  }

  redirect("/inscription");
}
