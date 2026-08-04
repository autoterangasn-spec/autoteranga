import type { SupabaseClient } from "@supabase/supabase-js";

import { createServiceClient } from "@/lib/supabase/service";

export interface ConfirmPaymentResult {
  success: boolean;
  devisId?: string;
  alreadyConfirmed?: boolean;
  error?: string;
}

/** Client session ou service role — typage permissif pour compatibilité webhook + mock. */
type ConfirmSupabase = SupabaseClient;

function getConfirmClient(supabase?: ConfirmSupabase): ConfirmSupabase {
  if (supabase) return supabase;
  try {
    return createServiceClient();
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? err.message
        : "SUPABASE_SERVICE_ROLE_KEY manquante pour la confirmation webhook."
    );
  }
}

type TransactionRow = {
  id: string;
  devis_id: string | null;
  statut: string;
  reference_paiement: string | null;
};

/**
 * Confirme un paiement Wave — met à jour assurance_transaction et devis.
 * Idempotent : si déjà confirmé, retourne success sans erreur.
 * Passez le client session utilisateur pour la simulation mock (sans service role).
 */
export async function confirmAssurancePayment(
  reference: string,
  waveSessionId?: string,
  supabase?: ConfirmSupabase
): Promise<ConfirmPaymentResult> {
  let db: ConfirmSupabase;
  try {
    db = getConfirmClient(supabase);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Client Supabase indisponible.",
    };
  }

  let transaction: TransactionRow | null = null;

  const { data: byId } = await db
    .from("assurance_transactions")
    .select("id, devis_id, statut, reference_paiement")
    .eq("id", reference)
    .maybeSingle();

  transaction = (byId as TransactionRow | null) ?? null;

  if (!transaction && waveSessionId) {
    const { data: byRef } = await db
      .from("assurance_transactions")
      .select("id, devis_id, statut, reference_paiement")
      .eq("reference_paiement", waveSessionId)
      .maybeSingle();
    transaction = (byRef as TransactionRow | null) ?? null;
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

  const { error: txError } = await db
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
    const { error: devisError } = await db
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
