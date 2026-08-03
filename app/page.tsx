import { redirect } from "next/navigation";

import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { getRedirectPathForRole } from "@/lib/supabase/routing";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
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
