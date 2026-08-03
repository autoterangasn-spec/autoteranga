"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import {
  isValidImmatriculation,
  isValidVehiculeYear,
  normalizeImmatriculation,
  type VehiculeType,
} from "@/lib/vehicules";
import type { Vehicule } from "@/lib/types/database";

const CARTE_GRISE_BUCKET = "carte-grise";
const VEHICULE_PHOTOS_BUCKET = "vehicule-photos";
const MAX_CARTE_GRISE_SIZE = 10 * 1024 * 1024;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_PHOTOS = 10;
const ALLOWED_CARTE_GRISE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

async function cleanupUploadedFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  carteGrisePath: string | null,
  photoPaths: string[]
) {
  if (carteGrisePath) {
    await supabase.storage.from(CARTE_GRISE_BUCKET).remove([carteGrisePath]);
  }
  if (photoPaths.length > 0) {
    await supabase.storage.from(VEHICULE_PHOTOS_BUCKET).remove(photoPaths);
  }
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
  const marque = String(formData.get("marque") ?? "").trim();
  const modele = String(formData.get("modele") ?? "").trim();
  const rawAnnee = String(formData.get("annee") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const rawPrixAchat = String(formData.get("prix_achat") ?? "").trim();
  const type = String(formData.get("type") ?? "") as VehiculeType;
  const carteGriseFile = formData.get("carte_grise") as File | null;
  const photoFiles = formData
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (!rawImmat) {
    return { error: "L'immatriculation est obligatoire." };
  }

  if (!marque) {
    return { error: "La marque est obligatoire." };
  }

  if (!modele) {
    return { error: "Le modèle est obligatoire." };
  }

  if (!rawAnnee) {
    return { error: "L'année est obligatoire." };
  }

  const annee = Number.parseInt(rawAnnee, 10);
  if (!/^\d{4}$/.test(rawAnnee) || !isValidVehiculeYear(annee)) {
    return { error: "Année invalide (4 chiffres, ex. 2019)." };
  }

  let prix_achat: number | null = null;
  if (rawPrixAchat) {
    prix_achat = Number.parseInt(rawPrixAchat.replace(/\s/g, ""), 10);
    if (!Number.isInteger(prix_achat) || prix_achat < 0) {
      return { error: "Prix d'achat invalide (montant en FCFA)." };
    }
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

  if (photoFiles.length > MAX_PHOTOS) {
    return { error: `Maximum ${MAX_PHOTOS} photos par véhicule.` };
  }

  for (const photo of photoFiles) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Photos : format accepté JPEG, PNG ou WebP." };
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return { error: "Chaque photo doit faire moins de 5 Mo." };
    }
  }

  let carte_grise_url: string | null = null;
  const uploadedPhotoPaths: string[] = [];

  if (carteGriseFile && carteGriseFile.size > 0) {
    if (!ALLOWED_CARTE_GRISE_TYPES.includes(carteGriseFile.type)) {
      return { error: "Carte grise : format accepté PDF, JPEG, PNG ou WebP." };
    }
    if (carteGriseFile.size > MAX_CARTE_GRISE_SIZE) {
      return { error: "Carte grise trop volumineuse (max 10 Mo)." };
    }

    const extension =
      carteGriseFile.name.split(".").pop()?.toLowerCase() ?? "pdf";
    carte_grise_url = `${user.id}/${Date.now()}-carte-grise.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(CARTE_GRISE_BUCKET)
      .upload(carte_grise_url, carteGriseFile, {
        contentType: carteGriseFile.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: `Échec upload carte grise : ${uploadError.message}` };
    }
  }

  for (let i = 0; i < photoFiles.length; i++) {
    const photo = photoFiles[i];
    const extension = photo.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const storagePath = `${user.id}/${Date.now()}-photo-${i}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(VEHICULE_PHOTOS_BUCKET)
      .upload(storagePath, photo, {
        contentType: photo.type,
        upsert: false,
      });

    if (uploadError) {
      await cleanupUploadedFiles(supabase, carte_grise_url, uploadedPhotoPaths);
      return { error: `Échec upload photo : ${uploadError.message}` };
    }

    uploadedPhotoPaths.push(storagePath);
  }

  const immatriculation = normalizeImmatriculation(rawImmat);

  const { data: inserted, error: insertError } = await supabase
    .from("vehicules")
    .insert({
      user_id: profile.id,
      immatriculation,
      marque,
      modele,
      annee,
      description,
      prix_achat,
      type,
      carte_grise_url,
      photos_urls: uploadedPhotoPaths.length > 0 ? uploadedPhotoPaths : null,
    })
    .select("*")
    .single();

  if (insertError) {
    await cleanupUploadedFiles(supabase, carte_grise_url, uploadedPhotoPaths);
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
    .select("id, carte_grise_url, photos_urls, user_id")
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

  if (vehicule.photos_urls?.length) {
    await supabase.storage
      .from(VEHICULE_PHOTOS_BUCKET)
      .remove(vehicule.photos_urls);
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

export async function getVehiculePhotoSignedUrl(
  storagePath: string
): Promise<ActionResult<string>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const { data: vehicule } = await supabase
    .from("vehicules")
    .select("id, photos_urls")
    .eq("user_id", profile.id)
    .contains("photos_urls", [storagePath])
    .maybeSingle();

  if (!vehicule) {
    return { error: "Photo non autorisée." };
  }

  const { data, error: signError } = await supabase.storage
    .from(VEHICULE_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (signError || !data?.signedUrl) {
    return { error: signError?.message ?? "Impossible d'afficher la photo." };
  }

  return { data: data.signedUrl, error: null };
}
