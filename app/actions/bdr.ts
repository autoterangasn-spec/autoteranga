"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import type { BordereauLigne, MoyenPaiement, Police } from "@/lib/types/database";

const BDR_BUCKET = "bordereaux-documents";

type ActionResult<T = void> = {
  data?: T;
  error: string | null;
};

interface PoliceForBdr extends Police {
  vehicules: { immatriculation: string } | null;
}

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

async function getLatestMoyenPaiement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  policeId: string
): Promise<MoyenPaiement | null> {
  const { data } = await supabase
    .from("assurance_transactions")
    .select("moyen_paiement")
    .eq("police_id", policeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.moyen_paiement as MoyenPaiement | undefined) ?? null;
}

function resolveDateSouscription(police: Police): string | null {
  return (
    police.date_souscription ??
    police.date_emission ??
    police.created_at?.slice(0, 10) ??
    null
  );
}

function isInMonth(dateStr: string | null, mois: number, annee: number): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.getMonth() + 1 === mois && d.getFullYear() === annee;
}

export async function genererBdrDuMois(
  mois?: number,
  annee?: number
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAdmin();
  if (auth.error || !auth.profile) {
    return { error: auth.error };
  }

  const now = new Date();
  const targetMois = mois ?? now.getMonth() + 1;
  const targetAnnee = annee ?? now.getFullYear();

  const { supabase, profile } = auth;

  const { data: existing } = await supabase
    .from("bordereaux_reglement")
    .select("id")
    .eq("mois", targetMois)
    .eq("annee", targetAnnee)
    .maybeSingle();

  if (existing) {
    return {
      error: `Un bordereau existe déjà pour ${targetMois}/${targetAnnee}.`,
      data: { id: existing.id },
    };
  }

  const { data: policesData, error: policesError } = await supabase
    .from("polices")
    .select("*, vehicules(immatriculation)")
    .eq("source_plateforme", true);

  if (policesError) {
    return { error: policesError.message };
  }

  const polices = (policesData ?? []) as PoliceForBdr[];
  const eligible = polices.filter((p) => {
    const dateRef = resolveDateSouscription(p);
    return isInMonth(dateRef, targetMois, targetAnnee);
  });

  if (eligible.length === 0) {
    return {
      error: `Aucune police plateforme trouvée pour ${targetMois}/${targetAnnee}.`,
    };
  }

  const lignes: Omit<BordereauLigne, "id" | "bordereau_id">[] = [];
  let totalPrimes = 0;
  let totalCommission = 0;

  for (const police of eligible) {
    const montantPrime = police.prime_ttc ?? 0;
    const commission = Math.round(Number(police.commission_autoteranga ?? 0));
    const moyenPaiement = await getLatestMoyenPaiement(supabase, police.id);

    lignes.push({
      police_id: police.id,
      n_police: police.num_police,
      immatriculation: police.vehicules?.immatriculation ?? "—",
      montant_prime: montantPrime,
      commission,
      date_souscription: resolveDateSouscription(police),
      moyen_paiement: moyenPaiement,
    });

    totalPrimes += montantPrime;
    totalCommission += commission;
  }

  const { data: bordereau, error: bordereauError } = await supabase
    .from("bordereaux_reglement")
    .insert({
      mois: targetMois,
      annee: targetAnnee,
      total_primes: totalPrimes,
      total_commission: totalCommission,
      statut: "brouillon",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (bordereauError || !bordereau) {
    return { error: bordereauError?.message ?? "Création du bordereau impossible." };
  }

  const { error: lignesError } = await supabase.from("bordereau_lignes").insert(
    lignes.map((l) => ({
      ...l,
      bordereau_id: bordereau.id,
    }))
  );

  if (lignesError) {
    return { error: lignesError.message };
  }

  revalidatePath("/admin/bdr");
  revalidatePath(`/admin/bdr/${bordereau.id}`);

  return { data: { id: bordereau.id }, error: null };
}

export async function uploadAvisRecette(
  bordereauId: string,
  formData: FormData
): Promise<ActionResult<{ url: string }>> {
  const auth = await requireAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Fichier PDF requis." };
  }

  if (file.type !== "application/pdf") {
    return { error: "Seuls les fichiers PDF sont acceptés." };
  }

  const { supabase } = auth;

  const { data: bordereau, error: fetchError } = await supabase
    .from("bordereaux_reglement")
    .select("mois, annee")
    .eq("id", bordereauId)
    .single();

  if (fetchError || !bordereau) {
    return { error: "Bordereau introuvable." };
  }

  const storagePath = `${bordereau.annee}/${String(bordereau.mois).padStart(2, "0")}/avis-recette-${Date.now()}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BDR_BUCKET)
    .upload(storagePath, file, { contentType: "application/pdf", upsert: false });

  if (uploadError) {
    return {
      error: uploadError.message.includes("Bucket not found")
        ? "Bucket bordereaux-documents manquant. Exécutez supabase/mvp-schema.sql."
        : uploadError.message,
    };
  }

  const storedUrl = `${BDR_BUCKET}/${storagePath}`;

  const { error: updateBdrError } = await supabase
    .from("bordereaux_reglement")
    .update({ avis_recette_url: storedUrl, statut: "solde" })
    .eq("id", bordereauId);

  if (updateBdrError) {
    return { error: updateBdrError.message };
  }

  const { data: lignes } = await supabase
    .from("bordereau_lignes")
    .select("police_id")
    .eq("bordereau_id", bordereauId);

  const policeIds = (lignes ?? [])
    .map((l) => l.police_id)
    .filter((id): id is string => Boolean(id));

  if (policeIds.length > 0) {
    await supabase
      .from("polices")
      .update({
        statut_paiement_askia: "avis_recette_recu",
        avis_recette_url: storedUrl,
      })
      .in("id", policeIds);
  }

  revalidatePath("/admin/bdr");
  revalidatePath(`/admin/bdr/${bordereauId}`);

  return { data: { url: storedUrl }, error: null };
}

export async function getAvisRecetteSignedUrl(
  avisRecetteUrl: string
): Promise<ActionResult<{ url: string }>> {
  const auth = await requireAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const path = avisRecetteUrl.replace(/^bordereaux-documents\//, "");

  const { data, error } = await auth.supabase.storage
    .from(BDR_BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data?.signedUrl) {
    return { error: error?.message ?? "Impossible de générer le lien." };
  }

  return { data: { url: data.signedUrl }, error: null };
}

export async function marquerBdrEnvoye(
  bordereauId: string
): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const { error } = await auth.supabase
    .from("bordereaux_reglement")
    .update({ statut: "envoye" })
    .eq("id", bordereauId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/bdr");
  revalidatePath(`/admin/bdr/${bordereauId}`);

  return { error: null };
}
