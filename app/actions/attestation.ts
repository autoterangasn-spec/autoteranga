"use server";

import { emitPoliceFromDevis } from "@/lib/askia/emission-police";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import type { DevisWithVehicule } from "@/lib/types/database";
import { formatCurrencyForPdf, formatDate } from "@/lib/utils";

type ActionResult<T = void> = {
  data?: T;
  error: string | null;
};

const POLICES_BUCKET = "polices-documents";
const MAX_PDF_SIZE = 10 * 1024 * 1024;

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

async function requireClientOrAdminForDevis(devisId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, devis: null, error: "Session expirée." };
  }

  const { profile, error } = await getProfileForAuthUser(supabase, user);
  if (error || !profile) {
    return { supabase, devis: null, error: "Profil introuvable." };
  }

  const { data, error: fetchError } = await supabase
    .from("devis_assurance")
    .select("*, vehicules(*)")
    .eq("id", devisId)
    .single();

  if (fetchError || !data) {
    return { supabase, devis: null, error: "Devis introuvable." };
  }

  const devis = data as DevisWithVehicule;

  if (profile.role === "admin") {
    return { supabase, devis, error: null };
  }

  if (profile.role !== "client" || devis.statut !== "police_emise") {
    return { supabase, devis: null, error: "Accès non autorisé." };
  }

  const { data: vehicule } = await supabase
    .from("vehicules")
    .select("user_id")
    .eq("id", devis.vehicule_id)
    .single();

  if (vehicule?.user_id !== profile.id) {
    return { supabase, devis: null, error: "Accès non autorisé." };
  }

  return { supabase, devis, error: null };
}

export async function generateAttestationPdf(
  devisId: string
): Promise<ActionResult<{ base64: string; filename: string }>> {
  const { devis, error } = await requireClientOrAdminForDevis(devisId);
  if (error || !devis) {
    return { error: error ?? "Devis introuvable." };
  }

  if (devis.statut !== "police_emise" || !devis.num_attestation) {
    return { error: "Attestation non disponible pour ce devis." };
  }

  const vehicule = devis.vehicules;
  const immat = vehicule?.immatriculation ?? "—";
  const marque = [vehicule?.marque, vehicule?.modele].filter(Boolean).join(" ") || "—";

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text("Attestation d'assurance automobile", 14, 22);

  doc.setFontSize(11);
  doc.text("Askia Assurances — via Autoteranga", 14, 30);
  doc.setDrawColor(200);
  doc.line(14, 34, 196, 34);

  let y = 46;
  const rows: [string, string][] = [
    ["N° attestation", devis.num_attestation],
    ["N° police", devis.num_police ?? "—"],
    ["Immatriculation", immat],
    ["Véhicule", marque],
    ["Formule", devis.formule.replace("_", " ")],
    ["Prime TTC", formatCurrencyForPdf(devis.prime_calculee)],
    ["Date d'émission", formatDate(new Date().toISOString())],
    ["Date de paiement", formatDate(devis.paid_at)],
  ];

  for (const [label, value] of rows) {
    doc.setFont("helvetica", "normal");
    doc.text(`${label} :`, 14, y);
    doc.setFont("helvetica", "bold");
    doc.text(value, 70, y);
    y += 10;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Document généré par Autoteranga. Vérification Diotali : https://aas.diotali.com",
    14,
    270
  );

  const arrayBuffer = doc.output("arraybuffer");
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const filename = `attestation-${devis.num_attestation}.pdf`;

  return { data: { base64, filename }, error: null };
}

export async function getDevisDocumentUrl(
  devisId: string,
  type: "attestation" | "facture"
): Promise<ActionResult<{ url: string }>> {
  const { devis, error } = await requireClientOrAdminForDevis(devisId);
  if (error || !devis) {
    return { error: error ?? "Devis introuvable." };
  }

  if (devis.statut !== "police_emise") {
    return { error: "Documents non disponibles pour ce devis." };
  }

  const storagePath =
    type === "attestation" ? devis.attestation_url : devis.facture_url;

  if (!storagePath) {
    if (type === "attestation" && devis.num_attestation) {
      const generated = await generateAttestationPdf(devisId);
      if (generated.data) {
        return {
          data: {
            url: `data:application/pdf;base64,${generated.data.base64}`,
          },
          error: null,
        };
      }
    }
    return { error: `${type === "attestation" ? "Attestation" : "Facture"} non disponible.` };
  }

  const supabase = await createClient();
  const { data, error: signError } = await supabase.storage
    .from(POLICES_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (signError || !data?.signedUrl) {
    return { error: signError?.message ?? "Lien de téléchargement indisponible." };
  }

  return { data: { url: data.signedUrl }, error: null };
}

async function uploadPolicePdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  storagePath: string
): Promise<string | null> {
  if (file.type !== "application/pdf") {
    return "Format accepté : PDF uniquement.";
  }
  if (file.size > MAX_PDF_SIZE) {
    return "Fichier trop volumineux (max 10 Mo).";
  }

  const { error } = await supabase.storage
    .from(POLICES_BUCKET)
    .upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: true,
    });

  return error?.message ?? null;
}

export async function validateAskiaManually(
  formData: FormData
): Promise<ActionResult<{ policeId: string }>> {
  const auth = await requireAdmin();
  if (auth.error) {
    return { error: auth.error };
  }

  const devisId = String(formData.get("devis_id") ?? "").trim();
  const police = String(formData.get("num_police") ?? "").trim();
  const attestation = String(formData.get("num_attestation") ?? "").trim();
  const attestationFile = formData.get("attestation_pdf") as File | null;
  const factureFile = formData.get("facture_pdf") as File | null;

  if (!devisId || !police || !attestation) {
    return { error: "N° police et N° attestation requis." };
  }

  if (!attestationFile?.size || !factureFile?.size) {
    return { error: "Attestation PDF et facture PDF requis." };
  }

  const attestationPath = `${police}/attestation-${attestation}.pdf`;
  const facturePath = `${police}/facture-${police}.pdf`;

  const attestationUploadError = await uploadPolicePdf(
    auth.supabase,
    attestationFile,
    attestationPath
  );
  if (attestationUploadError) {
    return { error: `Attestation : ${attestationUploadError}` };
  }

  const factureUploadError = await uploadPolicePdf(
    auth.supabase,
    factureFile,
    facturePath
  );
  if (factureUploadError) {
    return { error: `Facture : ${factureUploadError}` };
  }

  const result = await emitPoliceFromDevis({
    devisId,
    numPolice: police,
    numAttestation: attestation,
    attestationUrl: attestationPath,
    factureUrl: facturePath,
  });

  if (!result.success || !result.policeId) {
    return { error: result.error ?? "Émission police impossible." };
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/devis");
  revalidatePath(`/admin/devis/${devisId}`);
  revalidatePath("/client/devis");
  revalidatePath(`/client/devis/${devisId}`);

  return { data: { policeId: result.policeId }, error: null };
}
