import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase service role — webhooks et opérations système (bypass RLS).
 * Ne jamais exposer côté client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante. Requise pour les webhooks Wave/Askia."
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
