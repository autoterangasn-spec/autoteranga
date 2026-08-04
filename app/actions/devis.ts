"use server";

import { revalidatePath } from "next/cache";

import { calculerPrime, type FormuleAssurance } from "@/lib/askia-tarifs";
import { createClient } from "@/lib/supabase/server";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import type { DevisAssurance, DevisWithVehicule, Vehicule } from "@/lib/types/database";
import type { VehiculeType } from "@/lib/vehicules";

const CARTE_GRISE_BUCKET = "carte-grise";
const MAX_CARTE_GRISE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CARTE_GRISE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

async function getOwnedVehicule(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  vehiculeId: string
): Promise<Vehicule | null> {
  const { data } = await supabase
    .from("vehicules")
    .select("*")
    .eq("id", vehiculeId)
    .eq("user_id", profileId)
    .maybeSingle();

  return (data as Vehicule | null) ?? null;
}

export async function getMyDevis(): Promise<ActionResult<DevisWithVehicule[]>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id")
    .eq("user_id", profile.id);

  const vehiculeIds = (vehicules ?? []).map((v) => v.id);
  if (vehiculeIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error: fetchError } = await supabase
    .from("devis_assurance")
    .select("*, vehicules(*)")
    .in("vehicule_id", vehiculeIds)
    .order("created_at", { ascending: false });

  if (fetchError) {
    return { error: fetchError.message };
  }

  return { data: (data ?? []) as DevisWithVehicule[], error: null };
}

export async function getClientDevisDetail(
  devisId: string
): Promise<ActionResult<DevisWithVehicule>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const { data, error: fetchError } = await supabase
    .from("devis_assurance")
    .select("*, vehicules(*)")
    .eq("id", devisId)
    .maybeSingle();

  if (fetchError || !data) {
    return { error: "Devis introuvable." };
  }

  const devis = data as DevisWithVehicule;
  const owned = await getOwnedVehicule(supabase, profile.id, devis.vehicule_id);

  if (!owned) {
    return { error: "Accès non autorisé." };
  }

  return { data: devis, error: null };
}

export async function getVehiculeForDevis(
  vehiculeId: string
): Promise<ActionResult<Vehicule>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const vehicule = await getOwnedVehicule(supabase, profile.id, vehiculeId);
  if (!vehicule) {
    return { error: "Véhicule introuvable." };
  }

  return { data: vehicule, error: null };
}

export async function previewPrime(
  vehiculeId: string,
  formule: FormuleAssurance
): Promise<ActionResult<number>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const vehicule = await getOwnedVehicule(supabase, profile.id, vehiculeId);
  if (!vehicule) {
    return { error: "Véhicule introuvable." };
  }

  if (!vehicule.type) {
    return { error: "Type de véhicule manquant. Modifiez la fiche véhicule." };
  }

  if (!vehicule.annee) {
    return { error: "Année du véhicule manquante." };
  }

  const prime = calculerPrime({
    type: vehicule.type,
    annee: vehicule.annee,
    formule,
  });

  return { data: prime, error: null };
}

export async function submitDevis(formData: FormData): Promise<ActionResult<DevisAssurance>> {
  const { supabase, user, profile, error } = await requireClientProfile();
  if (error || !profile || !user) {
    return { error: error ?? "Profil introuvable." };
  }

  const vehiculeId = String(formData.get("vehicule_id") ?? "").trim();
  const formule = String(formData.get("formule") ?? "") as FormuleAssurance;
  const carteGriseFile = formData.get("carte_grise") as File | null;
  const useExistingCarteGrise =
    String(formData.get("use_existing_carte_grise") ?? "") === "true";

  if (!vehiculeId) {
    return { error: "Véhicule requis." };
  }

  if (!["tiers", "tiers_plus", "tous_risques"].includes(formule)) {
    return { error: "Formule invalide." };
  }

  const vehicule = await getOwnedVehicule(supabase, profile.id, vehiculeId);
  if (!vehicule) {
    return { error: "Véhicule introuvable." };
  }

  if (!vehicule.type || !vehicule.annee) {
    return {
      error:
        "Informations véhicule incomplètes (type et année requis pour le calcul).",
    };
  }

  let carte_grise_url: string | null = null;

  if (useExistingCarteGrise && vehicule.carte_grise_url) {
    carte_grise_url = vehicule.carte_grise_url;
  } else if (carteGriseFile && carteGriseFile.size > 0) {
    if (!ALLOWED_CARTE_GRISE_TYPES.includes(carteGriseFile.type)) {
      return { error: "Carte grise : format accepté PDF, JPEG, PNG ou WebP." };
    }
    if (carteGriseFile.size > MAX_CARTE_GRISE_SIZE) {
      return { error: "Carte grise trop volumineuse (max 10 Mo)." };
    }

    const extension =
      carteGriseFile.name.split(".").pop()?.toLowerCase() ?? "pdf";
    carte_grise_url = `${user.id}/devis-${Date.now()}-carte-grise.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(CARTE_GRISE_BUCKET)
      .upload(carte_grise_url, carteGriseFile, {
        contentType: carteGriseFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: `Échec upload carte grise : ${uploadError.message}` };
    }

    if (!vehicule.carte_grise_url) {
      await supabase
        .from("vehicules")
        .update({ carte_grise_url })
        .eq("id", vehicule.id)
        .eq("user_id", profile.id);
    }
  } else {
    return {
      error:
        "La carte grise est obligatoire pour finaliser votre demande de devis.",
    };
  }

  const prime_calculee = calculerPrime({
    type: vehicule.type as VehiculeType,
    annee: vehicule.annee,
    formule,
  });

  const { data: inserted, error: insertError } = await supabase
    .from("devis_assurance")
    .insert({
      vehicule_id: vehiculeId,
      formule,
      prime_calculee,
      statut: "envoye",
      carte_grise_url,
    })
    .select("*")
    .single();

  if (insertError) {
    if (carte_grise_url && !useExistingCarteGrise) {
      await supabase.storage.from(CARTE_GRISE_BUCKET).remove([carte_grise_url]);
    }
    return { error: insertError.message };
  }

  revalidatePath("/client/devis");
  revalidatePath("/client/vehicules");
  revalidatePath(`/client/vehicules/${vehiculeId}/devis`);

  return { data: inserted as DevisAssurance, error: null };
}
