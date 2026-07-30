import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isAdminProfile } from "@/lib/supabase/profile";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isAdmin = await isAdminProfile(supabase, user);

  if (isAdmin) {
    redirect("/admin/dashboard");
  }

  redirect("/login?error=unauthorized");
}
