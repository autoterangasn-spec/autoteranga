"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import {
  isValidImmatriculation,
  normalizeImmatriculation,
  type VehiculeType,
} from "@/lib/vehicules";
import type { Vehicule } from "@/lib/types/database";

const CARTE_GRISE_BUCKET = "carte-grise";

type ActionResult<T = void> = {
  data?: T;
  error: string | null;
};

async function requireClientProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null, error: "Session expirée." };
  }

  const { profile, error } = await getProfileForAuthUser(supabase, user);
  if (error || !profile || profile.role !== "client") {
    return { supabase, user, profile: null, error: "Accès réservé aux clients." };
  }

  return { supabase, user, profile, error: null };
}

export async function getMyVehicules(): Promise<ActionResult<Vehicule[]>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const { data, error: fetchError } = await supabase
    .from("vehicules")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  if (fetchError) {
    return { error: fetchError.message };
  }

  return { data: (data ?? []) as Vehicule[], error: null };
}

export async function createVehicule(formData: FormData): Promise<ActionResult<Vehicule>> {
  const { supabase, user, profile, error } = await requireClientProfile();
  if (error || !profile || !user) {
    return { error: error ?? "Profil introuvable." };
  }

  const rawImmat = String(formData.get("immatriculation") ?? "").trim();
  const type = String(formData.get("type") ?? "") as VehiculeType;
  const file = formData.get("carte_grise") as File | null;

  if (!rawImmat) {
    return { error: "L'immatriculation est obligatoire." };
  }

  if (!isValidImmatriculation(rawImmat)) {
    return {
      error:
        "Format d'immatriculation invalide. Exemple : AA-617-SE ou AA617SE.",
    };
  }

  if (type !== "auto" && type !== "moto") {
    return { error: "Sélectionnez le type de véhicule (auto ou moto)." };
  }

  if (!file || file.size === 0) {
    return { error: "La carte grise est obligatoire." };
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return { error: "Format accepté : PDF, JPEG, PNG ou WebP." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "Fichier trop volumineux (max 10 Mo)." };
  }

  const immatriculation = normalizeImmatriculation(rawImmat);
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const storagePath = `${user.id}/${Date.now()}-carte-grise.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(CARTE_GRISE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: `Échec upload carte grise : ${uploadError.message}` };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("vehicules")
    .insert({
      user_id: profile.id,
      immatriculation,
      type,
      carte_grise_url: storagePath,
    })
    .select("*")
    .single();

  if (insertError) {
    await supabase.storage.from(CARTE_GRISE_BUCKET).remove([storagePath]);
    return { error: insertError.message };
  }

  revalidatePath("/client/vehicules");
  return { data: inserted as Vehicule, error: null };
}

export async function deleteVehicule(id: string): Promise<ActionResult> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const { data: vehicule, error: fetchError } = await supabase
    .from("vehicules")
    .select("id, carte_grise_url, user_id")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (fetchError || !vehicule) {
    return { error: "Véhicule introuvable." };
  }

  const { error: deleteError } = await supabase
    .from("vehicules")
    .delete()
    .eq("id", id)
    .eq("user_id", profile.id);

  if (deleteError) {
    return { error: deleteError.message };
  }

  if (vehicule.carte_grise_url) {
    await supabase.storage
      .from(CARTE_GRISE_BUCKET)
      .remove([vehicule.carte_grise_url]);
  }

  revalidatePath("/client/vehicules");
  return { error: null };
}

export async function getCarteGriseSignedUrl(
  storagePath: string
): Promise<ActionResult<string>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const { data: vehicule } = await supabase
    .from("vehicules")
    .select("id")
    .eq("user_id", profile.id)
    .eq("carte_grise_url", storagePath)
    .maybeSingle();

  if (!vehicule) {
    return { error: "Document non autorisé." };
  }

  const { data, error: signError } = await supabase.storage
    .from(CARTE_GRISE_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (signError || !data?.signedUrl) {
    return { error: signError?.message ?? "Impossible d'ouvrir le document." };
  }

  return { data: data.signedUrl, error: null };
}
