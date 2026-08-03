const DEFAULT_SITE_URL = "https://autoteranga.com";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return DEFAULT_SITE_URL;
}

export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey && anonKey !== "your_anon_key_here"),
  };
}

export function getSupabaseConfigError(): string | null {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!url || !anonKey) {
    return "Configuration Supabase manquante. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sur Vercel, puis redéployez.";
  }

  if (!isConfigured) {
    return "Clé Supabase non configurée. Remplacez your_anon_key_here par la vraie clé anon.";
  }

  return null;
}
