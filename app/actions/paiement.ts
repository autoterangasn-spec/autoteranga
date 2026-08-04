"use server";

import { revalidatePath } from "next/cache";

import { confirmAssurancePayment } from "@/lib/payment/confirm";
import { getSiteUrl } from "@/lib/supabase/env";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { createWaveCheckoutSession, waveConfigured } from "@/lib/wave/client";
import type { DevisWithVehicule, MoyenPaiement } from "@/lib/types/database";

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

async function getOwnedDevis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  devisId: string
): Promise<DevisWithVehicule | null> {
  const { data: vehicules } = await supabase
    .from("vehicules")
    .select("id")
    .eq("user_id", profileId);

  const vehiculeIds = (vehicules ?? []).map((v) => v.id);
  if (vehiculeIds.length === 0) return null;

  const { data } = await supabase
    .from("devis_assurance")
    .select("*, vehicules(*)")
    .eq("id", devisId)
    .in("vehicule_id", vehiculeIds)
    .maybeSingle();

  return (data as DevisWithVehicule | null) ?? null;
}

export async function getDevisForPayment(
  devisId: string
): Promise<ActionResult<DevisWithVehicule>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const devis = await getOwnedDevis(supabase, profile.id, devisId);
  if (!devis) {
    return { error: "Devis introuvable." };
  }

  return { data: devis, error: null };
}

export async function initiatePayment(
  devisId: string,
  moyenPaiement: MoyenPaiement
): Promise<ActionResult<{ checkoutUrl: string; transactionId: string }>> {
  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  if (moyenPaiement === "om") {
    return {
      error:
        "Orange Money sera bientôt disponible. Veuillez choisir Wave pour le moment.",
    };
  }

  if (!waveConfigured()) {
    return {
      error:
        "Paiement Wave non configuré. Contactez le support ou activez WAVE_MOCK=true en développement.",
    };
  }

  const devis = await getOwnedDevis(supabase, profile.id, devisId);
  if (!devis) {
    return { error: "Devis introuvable." };
  }

  if (devis.statut !== "envoye") {
    return {
      error:
        devis.statut === "paye" || devis.statut === "police_emise"
          ? "Ce devis a déjà été payé."
          : "Ce devis n'est pas éligible au paiement.",
    };
  }

  const { data: existingTx } = await supabase
    .from("assurance_transactions")
    .select("id, statut, reference_paiement")
    .eq("devis_id", devisId)
    .eq("statut", "en_attente")
    .maybeSingle();

  if (existingTx?.reference_paiement) {
    if (process.env.WAVE_MOCK === "true") {
      const siteUrl = getSiteUrl();
      return {
        data: {
          checkoutUrl: `${siteUrl}/client/devis/mock-wave?session=${existingTx.reference_paiement}&ref=${existingTx.id}`,
          transactionId: existingTx.id,
        },
        error: null,
      };
    }
    return {
      data: {
        checkoutUrl: `https://pay.wave.com/c/${existingTx.reference_paiement.replace(/^mock_cs_/, "")}`,
        transactionId: existingTx.id,
      },
      error: null,
    };
  }

  if (existingTx && !existingTx.reference_paiement) {
    await supabase.from("assurance_transactions").delete().eq("id", existingTx.id);
  }

  const { data: transaction, error: insertError } = await supabase
    .from("assurance_transactions")
    .insert({
      devis_id: devisId,
      montant_prime: devis.prime_calculee,
      moyen_paiement: moyenPaiement,
      statut: "en_attente",
    })
    .select("id")
    .single();

  if (insertError || !transaction) {
    return { error: insertError?.message ?? "Création transaction impossible." };
  }

  const siteUrl = getSiteUrl();
  const successUrl = `${siteUrl}/client/devis/${devisId}/paiement?success=1`;
  const errorUrl = `${siteUrl}/client/devis/${devisId}/paiement?error=1`;

  try {
    const session = await createWaveCheckoutSession({
      amount: devis.prime_calculee,
      clientReference: transaction.id,
      successUrl,
      errorUrl,
    });

    await supabase
      .from("assurance_transactions")
      .update({ reference_paiement: session.id })
      .eq("id", transaction.id);

    revalidatePath("/client/devis");
    revalidatePath(`/client/devis/${devisId}/paiement`);

    return {
      data: {
        checkoutUrl: session.wave_launch_url,
        transactionId: transaction.id,
      },
      error: null,
    };
  } catch (err) {
    await supabase
      .from("assurance_transactions")
      .update({ statut: "echoue" })
      .eq("id", transaction.id);

    return {
      error:
        err instanceof Error
          ? err.message
          : "Impossible d'initialiser le paiement Wave.",
    };
  }
}

/** Mode mock : simule un paiement Wave réussi (dev uniquement). */
export async function simulateMockPayment(
  transactionId: string
): Promise<ActionResult> {
  if (process.env.WAVE_MOCK !== "true") {
    return { error: "Simulation disponible uniquement en mode WAVE_MOCK." };
  }

  const { supabase, profile, error } = await requireClientProfile();
  if (error || !profile) {
    return { error: error ?? "Profil introuvable." };
  }

  const { data: tx } = await supabase
    .from("assurance_transactions")
    .select("id, devis_id")
    .eq("id", transactionId)
    .maybeSingle();

  if (!tx?.devis_id) {
    return { error: "Transaction introuvable." };
  }

  const devis = await getOwnedDevis(supabase, profile.id, tx.devis_id);
  if (!devis) {
    return { error: "Accès non autorisé." };
  }

  const result = await confirmAssurancePayment(transactionId, `mock_cs_${transactionId}`);

  if (!result.success) {
    return { error: result.error ?? "Échec confirmation paiement." };
  }

  revalidatePath("/client/devis");
  revalidatePath(`/client/devis/${tx.devis_id}/paiement`);
  revalidatePath("/admin/devis");

  return { error: null };
}
