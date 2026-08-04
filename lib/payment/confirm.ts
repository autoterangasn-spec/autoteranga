import { createServiceClient } from "@/lib/supabase/service";

export interface ConfirmPaymentResult {
  success: boolean;
  devisId?: string;
  alreadyConfirmed?: boolean;
  error?: string;
}

/**
 * Confirme un paiement Wave — met à jour assurance_transaction et devis.
 * Idempotent : si déjà confirmé, retourne success sans erreur.
 */
export async function confirmAssurancePayment(
  reference: string,
  waveSessionId?: string
): Promise<ConfirmPaymentResult> {
  const supabase = createServiceClient();

  let transaction: {
    id: string;
    devis_id: string | null;
    statut: string;
    reference_paiement: string | null;
  } | null = null;

  const { data: byId } = await supabase
    .from("assurance_transactions")
    .select("id, devis_id, statut, reference_paiement")
    .eq("id", reference)
    .maybeSingle();

  transaction = byId;

  if (!transaction && waveSessionId) {
    const { data: byRef } = await supabase
      .from("assurance_transactions")
      .select("id, devis_id, statut, reference_paiement")
      .eq("reference_paiement", waveSessionId)
      .maybeSingle();
    transaction = byRef;
  }

  if (!transaction) {
    return { success: false, error: "Transaction introuvable." };
  }

  if (transaction.statut === "confirme") {
    return {
      success: true,
      devisId: transaction.devis_id ?? undefined,
      alreadyConfirmed: true,
    };
  }

  const { error: txError } = await supabase
    .from("assurance_transactions")
    .update({
      statut: "confirme",
      reference_paiement: waveSessionId ?? transaction.reference_paiement,
    })
    .eq("id", transaction.id);

  if (txError) {
    return { success: false, error: txError.message };
  }

  if (transaction.devis_id) {
    const { error: devisError } = await supabase
      .from("devis_assurance")
      .update({ statut: "paye", paid_at: new Date().toISOString() })
      .eq("id", transaction.devis_id)
      .eq("statut", "envoye");

    if (devisError) {
      return { success: false, error: devisError.message };
    }
  }

  return { success: true, devisId: transaction.devis_id ?? undefined };
}
