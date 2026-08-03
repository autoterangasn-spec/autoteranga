import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

import type { Profile } from "@/lib/types/database";

type ProfileLookupResult = {
  profile: Profile | null;
  error: string | null;
};

export async function getProfileForAuthUser(
  supabase: SupabaseClient,
  user: User
): Promise<ProfileLookupResult> {
  const selectFields = "id, auth_user_id, role, email, telephone";

  const byAuthUserId = await supabase
    .from("profiles")
    .select(selectFields)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (byAuthUserId.data) {
    return { profile: byAuthUserId.data as Profile, error: null };
  }

  if (byAuthUserId.error && byAuthUserId.error.code !== "PGRST116") {
    return {
      profile: null,
      error: byAuthUserId.error.message,
    };
  }

  const byId = await supabase
    .from("profiles")
    .select(selectFields)
    .eq("id", user.id)
    .maybeSingle();

  if (byId.data) {
    return { profile: byId.data as Profile, error: null };
  }

  if (user.email) {
    const byEmail = await supabase
      .from("profiles")
      .select(selectFields)
      .eq("email", user.email)
      .maybeSingle();

    if (byEmail.data) {
      return { profile: byEmail.data as Profile, error: null };
    }

    if (byEmail.error && byEmail.error.code !== "PGRST116") {
      return {
        profile: null,
        error: byEmail.error.message,
      };
    }
  }

  const appRole = user.app_metadata?.role;
  if (appRole === "admin") {
    return {
      profile: {
        id: user.id,
        auth_user_id: user.id,
        role: "admin",
        email: user.email ?? null,
        telephone: "",
        nom: null,
        prenoms: null,
        adresse: null,
        created_at: new Date().toISOString(),
      },
      error: null,
    };
  }

  return {
    profile: null,
    error:
      "Profil introuvable. Vérifiez que auth_user_id est lié à votre compte dans Supabase.",
  };
}

export async function isAdminProfile(
  supabase: SupabaseClient,
  user: User
): Promise<boolean> {
  const { profile } = await getProfileForAuthUser(supabase, user);
  return profile?.role === "admin";
}
