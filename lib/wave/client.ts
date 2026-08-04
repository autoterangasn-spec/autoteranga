import { createHmac } from "crypto";

import { getSiteUrl } from "@/lib/supabase/env";

const WAVE_API_BASE = "https://api.wave.com/v1";

export interface WaveCheckoutSession {
  id: string;
  amount: string;
  currency: string;
  status: string;
  client_reference: string | null;
  wave_launch_url: string;
  success_url: string;
  error_url: string;
}

export interface CreateCheckoutInput {
  amount: number;
  clientReference: string;
  successUrl: string;
  errorUrl: string;
}

/** Mock si WAVE_MOCK=true, ou si aucune clé API (dev local sans config Vercel). */
export function isWaveMockMode(): boolean {
  if (process.env.WAVE_MOCK === "true") return true;
  if (process.env.WAVE_MOCK === "false") return false;
  return !getWaveApiKey();
}

function getWaveApiKey(): string | null {
  const key = process.env.WAVE_API_KEY?.trim();
  if (!key || key === "your_wave_api_key_here") return null;
  return key;
}

export function waveConfigured(): boolean {
  return isWaveMockMode() || Boolean(getWaveApiKey());
}

export async function createWaveCheckoutSession(
  input: CreateCheckoutInput
): Promise<WaveCheckoutSession> {
  if (isWaveMockMode()) {
    const mockId = `mock_cs_${input.clientReference.slice(0, 8)}_${Date.now()}`;
    const siteUrl = getSiteUrl();
    return {
      id: mockId,
      amount: String(input.amount),
      currency: "XOF",
      status: "open",
      client_reference: input.clientReference,
      wave_launch_url: `${siteUrl}/client/devis/mock-wave?session=${mockId}&ref=${input.clientReference}`,
      success_url: input.successUrl,
      error_url: input.errorUrl,
    };
  }

  const apiKey = getWaveApiKey();
  if (!apiKey) {
    throw new Error(
      "Wave non configuré. Définissez WAVE_API_KEY ou WAVE_MOCK=true pour le développement."
    );
  }

  const body = JSON.stringify({
    amount: String(input.amount),
    currency: "XOF",
    client_reference: input.clientReference,
    success_url: input.successUrl,
    error_url: input.errorUrl,
  });

  const response = await fetch(`${WAVE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Wave checkout error (${response.status}): ${detail}`);
  }

  return (await response.json()) as WaveCheckoutSession;
}

export async function getWaveCheckoutSession(
  sessionId: string
): Promise<WaveCheckoutSession | null> {
  if (isWaveMockMode() && sessionId.startsWith("mock_cs_")) {
    return {
      id: sessionId,
      amount: "0",
      currency: "XOF",
      status: "complete",
      client_reference: null,
      wave_launch_url: "",
      success_url: "",
      error_url: "",
    };
  }

  const apiKey = getWaveApiKey();
  if (!apiKey) return null;

  const response = await fetch(`${WAVE_API_BASE}/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) return null;
  return (await response.json()) as WaveCheckoutSession;
}

/**
 * Vérifie la signature Wave-Signature (webhook).
 * Format : t={timestamp},v1={hmac_sha256_hex}
 */
export function verifyWaveWebhookSignature(
  rawBody: string,
  waveSignature: string | null,
  secret: string
): boolean {
  if (!waveSignature) return false;

  const parts = waveSignature.split(",");
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const signatureParts = parts.filter((p) => p.startsWith("v1="));

  if (!timestampPart || signatureParts.length === 0) return false;

  const timestamp = timestampPart.split("=")[1];
  const signatures = signatureParts.map((p) => p.split("=")[1]);
  const payload = timestamp + rawBody;

  const calculated = createHmac("sha256", secret).update(payload).digest("hex");

  return signatures.includes(calculated);
}
