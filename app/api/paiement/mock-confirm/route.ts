import { NextResponse } from "next/server";

import { confirmAssurancePayment } from "@/lib/payment/confirm";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";
import { isWaveMockMode } from "@/lib/wave/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isWaveMockMode()) {
    return NextResponse.json(
      { error: "Simulation disponible uniquement en mode mock Wave." },
      { status: 403 }
    );
  }

  let transactionId: string;
  try {
    const body = (await request.json()) as { transactionId?: string };
    transactionId = body.transactionId?.trim() ?? "";
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  if (!transactionId) {
    return NextResponse.json(
      { error: "Référence transaction manquante." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  }

  const { profile, error: profileError } = await getProfileForAuthUser(
    supabase,
    user
  );
  if (profileError || !profile || profile.role !== "client") {
    return NextResponse.json(
      { error: "Accès réservé aux clients." },
      { status: 403 }
    );
  }

  const { data: tx } = await supabase
    .from("assurance_transactions")
    .select("id, devis_id, statut")
    .eq("id", transactionId)
    .maybeSingle();

  if (!tx?.devis_id) {
    return NextResponse.json(
      { error: "Transaction introuvable." },
      { status: 404 }
    );
  }

  const { data: devis } = await supabase
    .from("devis_assurance")
    .select("id, vehicule_id")
    .eq("id", tx.devis_id)
    .maybeSingle();

  if (!devis?.vehicule_id) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  const { data: vehicule } = await supabase
    .from("vehicules")
    .select("user_id")
    .eq("id", devis.vehicule_id)
    .maybeSingle();

  if (!vehicule || vehicule.user_id !== profile.id) {
    return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
  }

  const result = await confirmAssurancePayment(
    transactionId,
    `mock_cs_${transactionId}`,
    supabase
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Échec confirmation paiement." },
      { status: 422 }
    );
  }

  return NextResponse.json({
    success: true,
    devisId: result.devisId,
    alreadyConfirmed: result.alreadyConfirmed ?? false,
  });
}
