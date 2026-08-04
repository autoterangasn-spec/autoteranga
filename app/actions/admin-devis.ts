"use server";

import { revalidatePath } from "next/cache";

import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import type { DevisWithVehicule } from "@/lib/types/database";

type ActionResult<T = void> = {
  data?: T;
  error: string | null;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null, error: "Session expirée." };
  }

  const { profile, error } = await getProfileForAuthUser(supabase, user);
  if (error || profile?.role !== "admin") {
    return { supabase, user, profile: null, error: "Accès non autorisé." };
  }

  return { supabase, user, profile, error: null };
}

export async function getAdminDevisList(): Promise<
  ActionResult<DevisWithVehicule[]>
> {
  const auth = await requireAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const { data, error } = await auth.supabase
    .from("devis_assurance")
    .select("*, vehicules(*)")
    .in("statut", ["envoye", "paye", "police_emise"])
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: (data ?? []) as DevisWithVehicule[], error: null };
}

export async function getAdminDevisDetail(
  devisId: string
): Promise<ActionResult<DevisWithVehicule>> {
  const auth = await requireAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const { data, error } = await auth.supabase
    .from("devis_assurance")
    .select("*, vehicules(*)")
    .eq("id", devisId)
    .single();

  if (error || !data) {
    return { error: "Devis introuvable." };
  }

  return { data: data as DevisWithVehicule, error: null };
}

export async function refreshAdminDevis() {
  revalidatePath("/admin/devis");
}
