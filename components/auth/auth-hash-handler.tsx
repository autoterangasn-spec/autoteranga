"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (!access_token || !refresh_token) return;

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(() => {
        window.history.replaceState(null, "", window.location.pathname);
        router.refresh();
      })
      .catch(console.error);
  }, [router]);

  return null;
}
