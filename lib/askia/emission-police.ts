import { createServiceClient } from "@/lib/supabase/service";
import type { DevisAssurance, Vehicule } from "@/lib/types/database";

export interface EmitPoliceInput {
  devisId: string;
  numPolice: string;
  numAttestation: string;
  attestationUrl?: string | null;
  factureUrl?: string | null;
}

export interface EmitPoliceResult {
  success: boolean;
  policeId?: string;
  error?: string;
}

function addOneYear(date: Date): string {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Émet une police Askia à partir d'un devis payé.
 * Crée la police, le document attestation, lie la transaction assurance.
 */
export async function emitPoliceFromDevis(
  input: EmitPoliceInput
): Promise<EmitPoliceResult> {
  const supabase = createServiceClient();

  const { data: devisData, error: devisError } = await supabase
    .from("devis_assurance")
    .select("*, vehicules(*)")
    .eq("id", input.devisId)
    .single();

  if (devisError || !devisData) {
    return { success: false, error: "Devis introuvable." };
  }

  const devis = devisData as DevisAssurance & { vehicules: Vehicule | null };

  if (devis.statut !== "paye" && devis.statut !== "police_emise") {
    return {
      success: false,
      error: `Devis non éligible (statut : ${devis.statut}). Paiement requis.`,
    };
  }

  if (devis.statut === "police_emise" && devis.police_id) {
    return { success: true, policeId: devis.police_id };
  }

  const vehicule = devis.vehicules;
  if (!vehicule) {
    return { success: false, error: "Véhicule introuvable pour ce devis." };
  }

  const today = new Date().toISOString().slice(0, 10);
  const primeTtc = devis.prime_calculee;
  const commission = Math.round(primeTtc * 0.14);

  const policePayload = {
    vehicule_id: vehicule.id,
    num_police: input.numPolice,
    date_emission: today,
    date_effet: today,
    date_expiration: addOneYear(new Date()),
    prime_ttc: primeTtc,
    prime_nette: Math.round(primeTtc * 0.82),
    accessoire: Math.round(primeTtc * 0.05),
    fga: Math.round(primeTtc * 0.03),
    tca: Math.round(primeTtc * 0.1),
    statut: "active" as const,
    source_plateforme: true,
    date_souscription: today,
    commission_autoteranga: commission,
    statut_paiement_askia: "en_attente" as const,
  };

  const { data: police, error: policeError } = await supabase
    .from("polices")
    .insert(policePayload)
    .select("id")
    .single();

  if (policeError || !police) {
    return { success: false, error: policeError?.message ?? "Création police impossible." };
  }

  const fichierUrl =
    input.attestationUrl ??
    `${input.numPolice}/attestation-${input.numAttestation}.pdf`;
  const diotaliUrl = `https://aas.diotali.com/#/attestation/${input.numAttestation}`;

  const { error: docError } = await supabase.from("police_documents").insert({
    police_id: police.id,
    type_document: "attestation",
    num_attestation: input.numAttestation,
    fichier_url: fichierUrl,
    diotali_url: diotaliUrl,
    qr_code_data: diotaliUrl,
  });

  if (docError) {
    return { success: false, error: docError.message };
  }

  if (input.factureUrl) {
    const { error: factureError } = await supabase.from("police_documents").insert({
      police_id: police.id,
      type_document: "facture",
      fichier_url: input.factureUrl,
    });

    if (factureError) {
      return { success: false, error: factureError.message };
    }
  }

  await supabase
    .from("assurance_transactions")
    .update({ police_id: police.id })
    .eq("devis_id", input.devisId);

  const { error: updateDevisError } = await supabase
    .from("devis_assurance")
    .update({
      statut: "police_emise",
      police_id: police.id,
      num_police: input.numPolice,
      num_attestation: input.numAttestation,
      attestation_url: input.attestationUrl ?? fichierUrl,
      facture_url: input.factureUrl ?? null,
    })
    .eq("id", input.devisId);

  if (updateDevisError) {
    return { success: false, error: updateDevisError.message };
  }

  return { success: true, policeId: police.id };
}
