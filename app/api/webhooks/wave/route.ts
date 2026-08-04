import { NextResponse } from "next/server";

import { confirmAssurancePayment } from "@/lib/payment/confirm";
import {
  getWaveCheckoutSession,
  isWaveMockMode,
  verifyWaveWebhookSignature,
} from "@/lib/wave/client";

export const dynamic = "force-dynamic";

interface WaveWebhookPayload {
  event?: string;
  type?: string;
  data?: {
    id?: string;
    status?: string;
    client_reference?: string | null;
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const waveSignature = request.headers.get("Wave-Signature");
  const webhookSecret = process.env.WAVE_WEBHOOK_SECRET?.trim();

  if (webhookSecret && webhookSecret !== "your_wave_webhook_secret_here") {
    if (!verifyWaveWebhookSignature(rawBody, waveSignature, webhookSecret)) {
      return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("WAVE_WEBHOOK_SECRET manquant en production");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 500 });
  }

  let payload: WaveWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WaveWebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const eventType = payload.event ?? payload.type ?? "";
  const session = payload.data;

  if (
    eventType !== "checkout.session.completed" &&
    session?.status !== "complete" &&
    session?.status !== "completed"
  ) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const sessionId = session?.id;
  const clientReference = session?.client_reference;

  if (!sessionId && !clientReference) {
    return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
  }

  if (sessionId && !isWaveMockMode()) {
    const verified = await getWaveCheckoutSession(sessionId);
    if (verified && verified.status !== "complete" && verified.status !== "completed") {
      return NextResponse.json({ received: true, pending: true });
    }
  }

  const reference = clientReference ?? sessionId ?? "";
  const result = await confirmAssurancePayment(reference, sessionId);

  if (!result.success) {
    console.error("Wave webhook confirm error:", result.error);
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({
    received: true,
    devisId: result.devisId,
    alreadyConfirmed: result.alreadyConfirmed ?? false,
  });
}
