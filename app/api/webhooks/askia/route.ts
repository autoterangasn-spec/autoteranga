import { NextResponse } from "next/server";

import { emitPoliceFromDevis } from "@/lib/askia/emission-police";
import { timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

interface AskiaWebhookPayload {
  devis_id?: string;
  num_police?: string;
  num_attestation?: string;
}

function verifyAskiaSecret(request: Request): boolean {
  const secret = process.env.ASKIA_WEBHOOK_SECRET?.trim();
  if (!secret || secret === "your_askia_webhook_secret_here") {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("Authorization");
  const tokenHeader = request.headers.get("X-Askia-Secret");

  const provided = authHeader?.replace(/^Bearer\s+/i, "") ?? tokenHeader ?? "";
  if (!provided) return false;

  try {
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return provided === secret;
  }
}

export async function POST(request: Request) {
  if (!verifyAskiaSecret(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let payload: AskiaWebhookPayload;
  try {
    payload = (await request.json()) as AskiaWebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const { devis_id, num_police, num_attestation } = payload;

  if (!devis_id || !num_police || !num_attestation) {
    return NextResponse.json(
      { error: "devis_id, num_police et num_attestation requis." },
      { status: 400 }
    );
  }

  const result = await emitPoliceFromDevis({
    devisId: devis_id,
    numPolice: num_police.trim(),
    numAttestation: num_attestation.trim(),
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    received: true,
    police_id: result.policeId,
  });
}
